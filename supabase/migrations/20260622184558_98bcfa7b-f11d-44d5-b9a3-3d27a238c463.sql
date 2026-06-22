
-- Theme settings (single global row)
CREATE TABLE public.theme_settings (
  id text PRIMARY KEY DEFAULT 'global',
  tokens jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.theme_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.theme_settings TO authenticated;
GRANT ALL ON public.theme_settings TO service_role;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme read public" ON public.theme_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "theme admin insert" ON public.theme_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "theme admin update" ON public.theme_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER theme_settings_updated_at
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fix quotes pro update: prevent changing protected fields via trigger
CREATE OR REPLACE FUNCTION public.protect_quote_pro_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the updater is the pro (not the client path)
  IF auth.uid() = OLD.pro_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'professionals cannot change quote status';
    END IF;
    IF NEW.pro_id IS DISTINCT FROM OLD.pro_id THEN
      RAISE EXCEPTION 'professionals cannot reassign a quote';
    END IF;
    IF NEW.job_id IS DISTINCT FROM OLD.job_id THEN
      RAISE EXCEPTION 'professionals cannot move a quote to another job';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_quote_pro_update ON public.quotes;
CREATE TRIGGER protect_quote_pro_update
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.protect_quote_pro_update();
