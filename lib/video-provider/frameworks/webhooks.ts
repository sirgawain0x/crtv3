import { createHmac, timingSafeEqual } from "crypto";

const WEBHOOK_TIMESTAMP_TOLERANCE_SEC = 5 * 60;

function decodeWebhookSecret(secret: string): Buffer {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(raw, "base64");
}

function parseV1Signatures(header: string): string[] {
  return header
    .split(/\s+/)
    .map((part) => {
      const [version, sig] = part.split(",", 2);
      return version === "v1" && sig ? sig.trim() : "";
    })
    .filter(Boolean);
}

function isTimestampFresh(timestamp: string): boolean {
  if (!/^\d+$/.test(timestamp)) return false;
  const tsSec = Number(timestamp);
  if (!Number.isFinite(tsSec)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - tsSec) <= WEBHOOK_TIMESTAMP_TOLERANCE_SEC;
}

/**
 * Verify inbound FrameWorks webhooks (Standard Webhooks-style headers).
 * Uses FRAMEWORKS_WEBHOOK_SECRET (whsec_...).
 */
export function verifyFrameworksWebhookSignature(
  rawBody: string | Buffer,
  headers: Record<string, string | null | undefined>,
): boolean {
  const secret = process.env.FRAMEWORKS_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const msgId = headers["webhook-id"] ?? headers["Webhook-Id"];
  const timestamp = headers["webhook-timestamp"] ?? headers["Webhook-Timestamp"];
  const signatureHeader = headers["webhook-signature"] ?? headers["Webhook-Signature"];
  if (!msgId || !timestamp || !signatureHeader) return false;
  if (!isTimestampFresh(timestamp)) return false;

  const bodyBuf = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
  const signedContent = `${msgId}.${timestamp}.${bodyBuf.toString("utf8")}`;
  const expected = createHmac("sha256", decodeWebhookSecret(secret))
    .update(signedContent)
    .digest("base64");

  for (const candidate of parseV1Signatures(signatureHeader)) {
    try {
      const a = Buffer.from(candidate);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* try next signature */
    }
  }
  return false;
}
