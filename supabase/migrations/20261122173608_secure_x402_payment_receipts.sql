-- Reserve signed x402 authorizations before settlement and consume feature
-- transaction receipts once. Store hashes only, never signatures or credentials.
CREATE TABLE IF NOT EXISTS public.platform_api_payment_receipts (
  transaction_hash text PRIMARY KEY,
  resource text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_api_payment_receipts_used_at_idx
  ON public.platform_api_payment_receipts (used_at);

ALTER TABLE public.platform_api_payment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_api_payment_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.platform_api_payment_receipts TO service_role;

COMMENT ON TABLE public.platform_api_payment_receipts IS
  'Server-only replay reservations and consumed x402 receipts. Keep reservations after settlement timeouts to prevent duplicate submission.';

-- Rollback: revert the app deployment first. Preserve this ledger to prevent
-- previously used payments from becoming reusable; do not drop it on rollback.
