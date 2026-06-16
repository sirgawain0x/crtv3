import type { Hash, TransactionReceipt } from "viem";
import { publicClient } from "@/lib/viem";

export class TransactionVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionVerificationError";
  }
}

export interface VerifiedReceipt {
  receipt: TransactionReceipt;
  blockNumber: bigint;
}

export interface VerifyReceiptOptions {
  /** Reject receipts older than this many seconds (by block timestamp). */
  maxAgeSeconds?: number;
}

/**
 * Fetch a successful on-chain transaction receipt on Base.
 */
export async function getVerifiedTransactionReceipt(
  transactionHash: string,
  options: VerifyReceiptOptions = {},
): Promise<VerifiedReceipt> {
  const hash = transactionHash.trim().toLowerCase() as Hash;
  if (!/^0x[a-f0-9]{64}$/.test(hash)) {
    throw new TransactionVerificationError("Invalid transaction hash format");
  }

  const receipt = await publicClient.getTransactionReceipt({ hash });
  if (!receipt) {
    throw new TransactionVerificationError("Transaction not found");
  }
  if (receipt.status !== "success") {
    throw new TransactionVerificationError("Transaction did not succeed");
  }

  if (options.maxAgeSeconds != null && options.maxAgeSeconds > 0) {
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    const ageSec = Math.floor(Date.now() / 1000) - Number(block.timestamp);
    if (ageSec > options.maxAgeSeconds) {
      throw new TransactionVerificationError("Transaction is too old");
    }
  }

  return { receipt, blockNumber: receipt.blockNumber };
}
