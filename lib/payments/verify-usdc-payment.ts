import { decodeEventLog } from "viem";
import { publicClient } from "@/lib/viem";
import { USDC_TOKEN_ADDRESSES } from "@/lib/contracts/USDCToken";
import { serverLogger } from "@/lib/utils/logger";

export type UsdcPaymentProof = {
  transactionHash: string;
  amount: string;
};

/**
 * Verifies a successful Base USDC Transfer to `recipient` with value >= required
 * and age within maxAgeMs.
 */
export async function verifyUsdcPaymentProof(options: {
  transactionHash: string;
  amount: string;
  recipient: string;
  requiredAmount: string;
  maxAgeMs: number;
  logLabel?: string;
}): Promise<{ valid: boolean; error?: string }> {
  const {
    transactionHash,
    amount,
    recipient,
    requiredAmount,
    maxAgeMs,
    logLabel = "UsdcPayment",
  } = options;

  let claimedAmount: bigint;
  let required: bigint;
  try {
    claimedAmount = BigInt(amount);
    required = BigInt(requiredAmount);
  } catch {
    return { valid: false, error: "Invalid payment amount" };
  }

  if (claimedAmount < required) {
    return { valid: false, error: "Payment amount is less than required" };
  }

  try {
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
    const recipientLc = recipient.toLowerCase();
    let foundTransfer = false;
    let transferValue = 0n;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== usdcAddress) continue;
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
          if (args.to.toLowerCase() === recipientLc) {
            foundTransfer = true;
            transferValue = args.value;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!foundTransfer || transferValue < required) {
      return {
        valid: false,
        error:
          "No valid USDC transfer to the service recipient found for this transaction",
      };
    }

    return { valid: true };
  } catch (err) {
    serverLogger.error(`[${logLabel}] Payment verification error:`, err);
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Payment verification failed",
    };
  }
}
