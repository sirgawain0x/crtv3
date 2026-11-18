import { createHmac, timingSafeEqual } from "crypto";
import type { VideoProviderId } from "./config";
import { WalletAuthError } from "@/lib/auth/require-wallet";

const TICKET_TTL_SECONDS = 2 * 60 * 60;

type UploadTicketPayload = {
  v: 1;
  uploadId: string;
  creator: string;
  exp: number;
};

function uploadTicketSecret(providerId: VideoProviderId): string {
  const envKey =
    providerId === "frameworks" ? "FRAMEWORKS_WEBHOOK_SECRET" : "LIVEPEER_WEBHOOK_SECRET";
  const secret = process.env[envKey]?.trim();
  if (!secret) {
    throw new WalletAuthError(
      503,
      `Upload session binding unavailable (${envKey} is unset)`,
    );
  }
  return secret;
}

function signPayload(payload: UploadTicketPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** HMAC upload ticket: binds uploadId to the creator wallet (provider webhook secret). */
export function mintUploadSessionTicket(
  uploadId: string,
  creator: string,
  providerId: VideoProviderId,
): string {
  const normalizedUploadId = uploadId.trim();
  const normalizedCreator = creator.trim().toLowerCase();
  if (!normalizedUploadId || !/^0x[0-9a-f]{40}$/.test(normalizedCreator)) {
    throw new Error("Invalid upload session ticket input");
  }
  const payload: UploadTicketPayload = {
    v: 1,
    uploadId: normalizedUploadId,
    creator: normalizedCreator,
    exp: Math.floor(Date.now() / 1000) + TICKET_TTL_SECONDS,
  };
  return signPayload(payload, uploadTicketSecret(providerId));
}

export function verifyUploadSessionTicket(
  ticket: string,
  uploadId: string,
  providerId: VideoProviderId,
): string {
  const trimmedTicket = ticket.trim();
  const normalizedUploadId = uploadId.trim();
  if (!trimmedTicket || !normalizedUploadId) {
    throw new WalletAuthError(403, "Invalid upload session ticket");
  }

  const dot = trimmedTicket.lastIndexOf(".");
  if (dot <= 0) {
    throw new WalletAuthError(403, "Malformed upload session ticket");
  }
  const body = trimmedTicket.slice(0, dot);
  const sig = trimmedTicket.slice(dot + 1);
  const secret = uploadTicketSecret(providerId);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new WalletAuthError(403, "Invalid upload session ticket signature");
  }

  let payload: UploadTicketPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UploadTicketPayload;
  } catch {
    throw new WalletAuthError(403, "Malformed upload session ticket payload");
  }

  if (payload.v !== 1 || payload.uploadId !== normalizedUploadId) {
    throw new WalletAuthError(403, "Upload session ticket does not match uploadId");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp < now) {
    throw new WalletAuthError(401, "Upload session ticket expired");
  }

  const creator = payload.creator?.trim().toLowerCase();
  if (!creator || !/^0x[0-9a-f]{40}$/.test(creator)) {
    throw new WalletAuthError(403, "Upload session ticket has invalid creator");
  }

  return creator;
}