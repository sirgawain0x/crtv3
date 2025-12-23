-- Fix mutable search_path issue on sync_burns_to_transactions function
-- This migration sets an explicit search_path to prevent security issues
-- and ensure predictable behavior

CREATE OR REPLACE FUNCTION public.sync_burns_to_transactions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  metoken_uuid UUID;
BEGIN
  -- Find the metoken UUID by address
  SELECT id INTO metoken_uuid
  FROM public.metokens
  WHERE LOWER(address) = LOWER(NEW.me_token);
  
  -- Only insert if metoken exists and transaction doesn't already exist
  IF metoken_uuid IS NOT NULL THEN
    INSERT INTO public.metoken_transactions (
      metoken_id,
      user_address,
      transaction_type,
      amount,
      collateral_amount,
      block_number,
      created_at
    )
    VALUES (
      metoken_uuid,
      NEW."user",
      'burn',
      CAST(NEW.me_token_amount AS NUMERIC),
      CAST(NEW.collateral_amount AS NUMERIC),
      NULL, -- block_number not available from subgraph
      TO_TIMESTAMP(NEW.timestamp)
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$;

