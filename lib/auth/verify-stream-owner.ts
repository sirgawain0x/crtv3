import {
  verifyWalletAuthArgs,
  WalletAuthError,
  type WalletAuthArgs,
} from "@/lib/auth/require-wallet";
import { isLinkedWalletCompanion } from "@/lib/utils/linked-identity";

/**
 * Verify the caller controls the stream identified by `creatorId`.
 * Accepts either a direct address match or a provable EOA↔SCA companion pair.
 */
export async function verifyStreamOwner(
  creatorId: string,
  auth: WalletAuthArgs | undefined,
): Promise<void> {
  const { address } = await verifyWalletAuthArgs(auth);
  const normalizedCreator = creatorId.toLowerCase();
  if (address === normalizedCreator) {
    return;
  }
  if (await isLinkedWalletCompanion(address, normalizedCreator)) {
    return;
  }
  throw new WalletAuthError(
    403,
    "Authenticated address does not match the stream owner",
  );
}

export function redactStreamKey<T extends { stream_key: string }>(
  stream: T,
): Omit<T, "stream_key"> {
  const { stream_key: _streamKey, ...publicStream } = stream;
  return publicStream;
}
