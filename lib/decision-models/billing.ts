/**
 * x402 / USDC billing for user-triggered TypeSafe Jev gates.
 *
 * Free (platform absorbs TypeSafe COGS):
 * - Creative Guide intent routing
 * - Live chat toxicity/spam filter
 *
 * Paid (user pays USDC on Base via x402 before the gate runs):
 * - Campaign AI review on create
 * - Prediction draft quality/resolvability gate
 */

/** Shared USDC recipient for paid AI services on Base (same treasury as Creative Guide). */
export const DECISION_GATE_RECIPIENT =
  "0x31ee83aef931a1af321c505053040e98545a5614" as const;

/** Max age of payment tx (ms) to prevent replay. */
export const DECISION_GATE_PAYMENT_MAX_AGE_MS = 10 * 60 * 1000;

export const DECISION_GATE_X402_ENDPOINT =
  "https://x402.payai.network/api/base/paid-content";

/** $0.01 USDC (6 decimals) — brand campaign AI review. */
export const CAMPAIGN_GATE_PRICE = "10000";

/** $0.005 USDC (6 decimals) — prediction draft gate. */
export const PREDICTION_GATE_PRICE = "5000";

export type DecisionGateService = "campaign-gate" | "prediction-gate";

export function paymentRequiredBody(service: DecisionGateService) {
  const amount =
    service === "campaign-gate" ? CAMPAIGN_GATE_PRICE : PREDICTION_GATE_PRICE;
  return {
    error: "Payment proof is required for AI review.",
    code: "PAYMENT_REQUIRED" as const,
    service,
    amount,
    recipient: DECISION_GATE_RECIPIENT,
    endpoint: DECISION_GATE_X402_ENDPOINT,
  };
}
