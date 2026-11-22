import { consumePaymentReceipt } from "@/lib/middleware/paymentReplayGuard";
import {
  CREATIVE_GUIDE_PAYMENT_MAX_AGE_MS,
  CREATIVE_GUIDE_PRICE,
  CREATIVE_GUIDE_RECIPIENT,
} from "./constants";
import { verifyUsdcPaymentProof } from "@/lib/payments/verify-usdc-payment";

/**
 * Verifies a USDC transfer to the Creative Guide recipient with amount >= CREATIVE_GUIDE_PRICE.
 */
export async function verifyCreativeGuidePaymentProof(
  transactionHash: string,
  amount: string
): Promise<{ valid: boolean; error?: string }> {
  const verified = await verifyUsdcPaymentProof({
    transactionHash,
    amount,
    recipient: CREATIVE_GUIDE_RECIPIENT,
    requiredAmount: CREATIVE_GUIDE_PRICE,
    maxAgeMs: CREATIVE_GUIDE_PAYMENT_MAX_AGE_MS,
    logLabel: "CreativeGuide",
  });
  if (!verified.valid) return verified;
  const consumed = await consumePaymentReceipt(transactionHash, "creative-guide-redemption");
  return consumed.ok ? { valid: true } : { valid: false, error: consumed.error };
}
