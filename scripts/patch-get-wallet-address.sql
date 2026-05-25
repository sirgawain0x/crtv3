-- Run this alone if fix-security-advisor-warnings.sql failed at get_wallet_address()
CREATE OR REPLACE FUNCTION public.get_wallet_address()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT nullif(
    coalesce(
      current_setting('request.jwt.claim.address', true)::text,
      current_setting('request.jwt.claim.sub', true)::text
    ),
    ''::text
  )::text;
$$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_address() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_wallet_address() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_wallet_address() FROM authenticated;
