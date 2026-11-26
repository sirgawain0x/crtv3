import {
  verifyWalletAuthArgs,
  WalletAuthError,
  type WalletAuthArgs,
} from "@/lib/auth/require-wallet";
import { resolveVideoProviderId } from "./config";
import { mintUploadSessionTicket, verifyUploadSessionTicket } from "./upload-session-ticket";

export function isWalletAuthProvided(auth: WalletAuthArgs | undefined): boolean {
  if (!auth) return false;
  return Boolean(
    auth.address?.trim() &&
      auth.signature?.trim() &&
      Number.isFinite(auth.timestamp) &&
      auth.timestamp > 0,
  );
}

/** Authenticated creator for upload create (ignores any client-supplied creator address). */
export async function requireUploadCreatorWallet(
  auth: WalletAuthArgs | undefined,
): Promise<string> {
  const { address } = await verifyWalletAuthArgs(auth);
  return address;
}

export function maybeMintUploadSessionTicket(
  uploadId: string | undefined,
  creator: string,
): string | undefined {
  const id = uploadId?.trim();
  if (!id) return undefined;
  return mintUploadSessionTicket(id, creator, resolveVideoProviderId());
}

/** Creator must match wallet auth and the HMAC ticket from create time. */
export async function requireUploadSessionOwner(
  auth: WalletAuthArgs | undefined,
  uploadId: string,
  uploadTicket: string | undefined,
): Promise<string> {
  const { address } = await verifyWalletAuthArgs(auth);
  if (!uploadTicket?.trim()) {
    throw new WalletAuthError(403, "Missing upload session ticket");
  }
  const ticketOwner = verifyUploadSessionTicket(
    uploadTicket,
    uploadId,
    resolveVideoProviderId(),
  );
  if (ticketOwner !== address) {
    throw new WalletAuthError(
      403,
      "Authenticated wallet does not own this upload session",
    );
  }
  return address;
}

/**
 * Abort authorization: valid HMAC ticket for uploadId is required; wallet proof is optional.
 * When proof is present and valid it must match the ticket creator; stale/missing proof still
 * allows abort if the ticket is valid.
 */
export async function requireUploadSessionAbort(
  auth: WalletAuthArgs | undefined,
  uploadId: string,
  uploadTicket: string | undefined,
): Promise<string> {
  if (!uploadTicket?.trim()) {
    throw new WalletAuthError(403, "Missing upload session ticket");
  }
  const ticketOwner = verifyUploadSessionTicket(
    uploadTicket,
    uploadId,
    resolveVideoProviderId(),
  );

  if (isWalletAuthProvided(auth)) {
    try {
      const { address } = await verifyWalletAuthArgs(auth);
      if (address !== ticketOwner) {
        throw new WalletAuthError(
          403,
          "Authenticated wallet does not own this upload session",
        );
      }
      return address;
    } catch (err) {
      if (err instanceof WalletAuthError && err.status === 403) {
        throw err;
      }
    }
  }

  return ticketOwner;
}