-- Fix SECURITY DEFINER issue on metoken burn views
-- This migration changes the views from SECURITY DEFINER to SECURITY INVOKER
-- to ensure they respect RLS policies of the querying user

-- Fix metoken_burn_stats view
DROP VIEW IF EXISTS public.metoken_burn_stats;

CREATE OR REPLACE VIEW public.metoken_burn_stats 
WITH (security_invoker=true) AS
SELECT 
  me_token,
  count(*) AS total_burns,
  count(DISTINCT "user") AS unique_burners,
  min("timestamp") AS first_burn_timestamp,
  max("timestamp") AS last_burn_timestamp,
  max(created_at) AS last_synced_at
FROM metoken_burns
GROUP BY me_token;

-- Fix recent_metoken_burns view
DROP VIEW IF EXISTS public.recent_metoken_burns;

CREATE OR REPLACE VIEW public.recent_metoken_burns 
WITH (security_invoker=true) AS
SELECT 
  mb.id,
  mb.me_token,
  mb."user",
  mb.me_token_amount,
  mb.collateral_amount,
  mb."timestamp",
  mb.created_at,
  mb.updated_at,
  mt.name AS metoken_name,
  mt.symbol AS metoken_symbol,
  mt.owner_address AS metoken_owner,
  to_timestamp(mb."timestamp"::double precision) AS burn_timestamp
FROM metoken_burns mb
LEFT JOIN metokens mt ON lower(mb.me_token) = lower(mt.address)
ORDER BY mb."timestamp" DESC NULLS LAST, mb.created_at DESC;

-- Grant SELECT permission to authenticated and anon users
GRANT SELECT ON public.metoken_burn_stats TO anon, authenticated;
GRANT SELECT ON public.recent_metoken_burns TO anon, authenticated;

