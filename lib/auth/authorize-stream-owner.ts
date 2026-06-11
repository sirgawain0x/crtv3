import {
  verifyWalletAuthArgs,
  WalletAuthError,
  type WalletAuthArgs,
} from "@/lib/auth/require-wallet";
import { isLinkedWalletCompanion } from "@/lib/utils/linked-identity";

/**
 * Verifies wallet auth and ensures the signer controls the stream owner
 * (exact match or provable EOA↔SMA companion).
 */
export async function authorizeStreamOwner(
  creatorId: string,
  auth: WalletAuthArgs | undefined,
): Promise<string> {
  const { address: verified } = await verifyWalletAuthArgs(auth);
  const creator = creatorId.toLowerCase();

  if (verified === creator) {
    return verified;
  }

  if (await isLinkedWalletCompanion(verified, creator)) {
    return verified;
  }

  throw new WalletAuthError(
    403,
    "Authenticated address does not match the stream creator",
  );
}
