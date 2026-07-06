
REVOKE EXECUTE ON FUNCTION public.submit_quote(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_quote(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_quote(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_job(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quote(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_quote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_quote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
