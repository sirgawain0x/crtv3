-- Track consumed x402 payment transaction hashes to prevent replay within the payment window.
CREATE TABLE IF NOT EXISTS platform_api_payment_receipts (
  transaction_hash text PRIMARY KEY,
  resource text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_api_payment_receipts_used_at_idx
  ON platform_api_payment_receipts (used_at);

COMMENT ON TABLE platform_api_payment_receipts IS
  'One row per consumed USDC payment proof for Platform API x402 access.';
