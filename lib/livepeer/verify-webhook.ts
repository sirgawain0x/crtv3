import { createHmac, timingSafeEqual } from "crypto";
import { normalizeEnvSecret } from "@/lib/sdk/livepeer/studioAuth";

/**
 * Verifies Livepeer webhook signatures (`Livepeer-Signature: t=...,s=...`).
 * Returns true when no secret is configured (dev) or signature matches.
 */
export function verifyLivepeerWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = normalizeEnvSecret(process.env.LIVEPEER_WEBHOOK_SECRET);
  if (!secret) return true;
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.s;
  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
