import { decodeEventLog } from "viem";
import { USDC_TOKEN_ADDRESSES } from "@/lib/contracts/USDCToken";

const DEFAULT_PAYMENT_MAX_AGE_MS = 10 * 60 * 1000;

async function getPublicClient() {
  const { publicClient } = await import("@/lib/viem");
  return publicClient;
}

export type UsdcPaymentProof = {
  transactionHash: string;
  amount: string;
};

export type VerifyUsdcPaymentResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Verifies a USDC transfer on Base to the expected recipient with at least the required amount.
 */
export async function verifyUsdcPaymentProof(
  proof: UsdcPaymentProof,
  options: {
    recipient: string;
    requiredAmount: bigint;
    maxAgeMs?: number;
  },
): Promise<VerifyUsdcPaymentResult> {
  const { transactionHash, amount } = proof;
  const { recipient, requiredAmount, maxAgeMs = DEFAULT_PAYMENT_MAX_AGE_MS } = options;

  let claimedAmount: bigint;
  try {
    claimedAmount = BigInt(amount);
  } catch {
    return { valid: false, error: "Invalid payment amount" };
  }

  if (claimedAmount < requiredAmount) {
    return { valid: false, error: "Payment amount is less than required" };
  }

  try {
    const publicClient = await getPublicClient();
    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    if (!receipt) {
      return { valid: false, error: "Transaction not found" };
    }
    if (receipt.status !== "success") {
      return { valid: false, error: "Transaction failed" };
    }

    const now = Date.now();
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    const blockTime = Number(block.timestamp) * 1000;
    if (now - blockTime > maxAgeMs) {
      return { valid: false, error: "Payment too old; please pay again and retry" };
    }

    const usdcAddress = USDC_TOKEN_ADDRESSES.base.toLowerCase();
    const recipientLower = recipient.toLowerCase();
    let foundTransfer = false;
    let transferValue = 0n;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== usdcAddress) {
        continue;
      }
      try {
        const decoded = decodeEventLog({
          abi: [
            {
              type: "event",
              name: "Transfer",
              inputs: [
                { name: "from", type: "address", indexed: true },
                { name: "to", type: "address", indexed: true },
                { name: "value", type: "uint256", indexed: false },
              ],
            },
          ],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "Transfer") {
          const args = decoded.args as { from: string; to: string; value: bigint };
          if (args.to.toLowerCase() === recipientLower) {
            foundTransfer = true;
            transferValue = args.value;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!foundTransfer || transferValue < requiredAmount) {
      return {
        valid: false,
        error: "No valid USDC transfer to the service recipient found for this transaction",
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Payment verification failed",
    };
  }
}

export function parsePaymentProofHeader(headerValue: string | null): UsdcPaymentProof | null {
  if (!headerValue?.trim()) {
    return null;
  }

  try {
    const json = Buffer.from(headerValue.trim(), "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { transactionHash?: string; amount?: string };
    if (!parsed.transactionHash || !parsed.amount) {
      return null;
    }
    return { transactionHash: parsed.transactionHash, amount: parsed.amount };
  } catch {
    return null;
  }
}
