import {
  verifyWalletAuthArgs,
  WalletAuthError,
  type WalletAuthArgs,
} from "@/lib/auth/require-wallet";

/** Verifies signed wallet auth and that the caller owns the stream creator id. */
export async function verifyStreamCreatorWalletAuth(
  creatorId: string,
  auth: WalletAuthArgs,
): Promise<string> {
  const { address } = await verifyWalletAuthArgs(auth);
  const normalizedCreator = creatorId.toLowerCase();
  if (address !== normalizedCreator) {
    throw new WalletAuthError(
      403,
      "Authenticated address does not match the stream creator",
    );
  }
  return address;
}
