import type { WalletAuthArgs } from "@/lib/auth/require-wallet";

export interface WalletAuthHeaders {
  "X-Wallet-Address": string;
  "X-Wallet-Timestamp": string;
  "X-Wallet-Signature": string;
}

export function walletAuthArgsFromHeaders(
  headers: WalletAuthHeaders,
): WalletAuthArgs {
  return {
    address: headers["X-Wallet-Address"],
    timestamp: Number(headers["X-Wallet-Timestamp"]),
    signature: headers["X-Wallet-Signature"],
  };
}
