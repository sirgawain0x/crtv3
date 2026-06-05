import { supabaseService } from "@/lib/sdk/supabase/service";
import { serverLogger } from "@/lib/utils/logger";

export type ConsumePaymentReceiptResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Records a payment transaction hash so the same proof cannot be reused.
 * Returns an error when the hash was already consumed.
 */
export async function consumePaymentReceipt(
  transactionHash: string,
  resource: string,
): Promise<ConsumePaymentReceiptResult> {
  const normalizedHash = transactionHash.trim().toLowerCase();
  if (!normalizedHash.startsWith("0x")) {
    return { ok: false, error: "Invalid transaction hash" };
  }

  const supabase = supabaseService;
  if (!supabase) {
    serverLogger.error("[paymentReplayGuard] Supabase service client unavailable");
    return { ok: false, error: "Payment receipt storage unavailable" };
  }

  const { error } = await supabase.from("platform_api_payment_receipts").insert({
    transaction_hash: normalizedHash,
    resource,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Payment proof already used" };
    }
    serverLogger.error("[paymentReplayGuard] Failed to record payment receipt", error);
    return { ok: false, error: "Unable to record payment receipt" };
  }

  return { ok: true };
}
