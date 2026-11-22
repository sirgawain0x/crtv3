import { CREATIVE_TREASURY_ADDRESS } from "@/lib/payments/x402-config";

/** USDC recipient for Creative Guide paid Gemini queries (x402 gate). */
export const CREATIVE_GUIDE_RECIPIENT =
  CREATIVE_TREASURY_ADDRESS;

/** Required USDC amount in base units (6 decimals): $0.005 USDC per escalated chat. */
export const CREATIVE_GUIDE_PRICE = '5000';

/** Max age of payment tx (ms) to prevent replay. */
export const CREATIVE_GUIDE_PAYMENT_MAX_AGE_MS = 10 * 60 * 1000;

export const CREATIVE_GUIDE_X402_ENDPOINT =
  '/api/payments/x402';
