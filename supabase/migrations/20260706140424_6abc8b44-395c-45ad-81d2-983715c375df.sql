
-- 1. jobs.completed_at
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Helper: has_active_subscription (idempotent)
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND (
        (s.status IN ('active','trialing','past_due')
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR (s.status = 'canceled' AND s.current_period_end IS NOT NULL AND s.current_period_end > now())
      )
  )
$$;

-- 3. submit_quote RPC
CREATE OR REPLACE FUNCTION public.submit_quote(_job_id uuid, _amount integer, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid AND p.primary_type = 'professional' AND p.review_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'only approved professionals can submit quotes';
  END IF;

  IF NOT public.has_active_subscription(_uid) THEN
    RAISE EXCEPTION 'active subscription required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = _job_id AND j.status = 'open' AND j.review_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'job not available';
  END IF;

  INSERT INTO public.quotes (job_id, pro_id, amount, message, status)
  VALUES (_job_id, _uid, _amount, NULLIF(_message, ''), 'pending')
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

-- 4. accept_quote RPC
CREATE OR REPLACE FUNCTION public.accept_quote(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _job_id uuid;
  _pro_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT q.job_id, q.pro_id INTO _job_id, _pro_id
  FROM public.quotes q
  JOIN public.jobs j ON j.id = q.job_id
  WHERE q.id = _quote_id AND j.client_id = _uid AND q.status = 'pending' AND j.status = 'open';

  IF _job_id IS NULL THEN RAISE EXCEPTION 'quote not acceptable'; END IF;

  UPDATE public.quotes SET status = 'accepted' WHERE id = _quote_id;
  UPDATE public.quotes SET status = 'declined'
   WHERE job_id = _job_id AND id <> _quote_id AND status = 'pending';
  UPDATE public.jobs SET status = 'in_progress', awarded_pro_id = _pro_id
   WHERE id = _job_id;
END;
$$;

-- 5. decline_quote RPC
CREATE OR REPLACE FUNCTION public.decline_quote(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.quotes q
     SET status = 'declined'
   WHERE q.id = _quote_id AND q.status = 'pending'
     AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = q.job_id AND j.client_id = _uid);
  IF NOT FOUND THEN RAISE EXCEPTION 'quote not declinable'; END IF;
END;
$$;

-- 6. complete_job RPC (client only)
CREATE OR REPLACE FUNCTION public.complete_job(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.jobs
     SET status = 'completed', completed_at = now()
   WHERE id = _job_id AND client_id = _uid AND status = 'in_progress';
  IF NOT FOUND THEN RAISE EXCEPTION 'job cannot be completed'; END IF;
END;
$$;

-- 7. refresh_pro_rating trigger
CREATE OR REPLACE FUNCTION public.refresh_pro_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pro uuid;
BEGIN
  _pro := COALESCE(NEW.pro_id, OLD.pro_id);
  UPDATE public.profiles p
     SET rating_avg = sub.avg_rating,
         review_count = sub.cnt
    FROM (
      SELECT AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*)::int AS cnt
      FROM public.reviews WHERE pro_id = _pro
    ) sub
   WHERE p.id = _pro;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_pro_rating_ins ON public.reviews;
DROP TRIGGER IF EXISTS trg_refresh_pro_rating_upd ON public.reviews;
DROP TRIGGER IF EXISTS trg_refresh_pro_rating_del ON public.reviews;
CREATE TRIGGER trg_refresh_pro_rating_ins AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_pro_rating();
CREATE TRIGGER trg_refresh_pro_rating_upd AFTER UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_pro_rating();
CREATE TRIGGER trg_refresh_pro_rating_del AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_pro_rating();

-- 8. Realtime publications
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
