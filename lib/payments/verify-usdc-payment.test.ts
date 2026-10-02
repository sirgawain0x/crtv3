import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetTransactionReceipt = vi.fn();
const mockGetBlock = vi.fn();

vi.mock("@/lib/viem", () => ({
  publicClient: {
    getTransactionReceipt: (...args: unknown[]) =>
      mockGetTransactionReceipt(...args),
    getBlock: (...args: unknown[]) => mockGetBlock(...args),
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { verifyUsdcPaymentProof } from "./verify-usdc-payment";
import { USDC_TOKEN_ADDRESSES } from "@/lib/contracts/USDCToken";

const RECIPIENT = "0x31ee83aef931a1af321c505053040e98545a5614";
const TX =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

afterEach(() => {
  vi.restoreAllMocks();
  mockGetTransactionReceipt.mockReset();
  mockGetBlock.mockReset();
});

describe("verifyUsdcPaymentProof", () => {
  it("rejects invalid amount strings", async () => {
    const result = await verifyUsdcPaymentProof({
      transactionHash: TX,
      amount: "not-a-number",
      recipient: RECIPIENT,
      requiredAmount: "10000",
      maxAgeMs: 60_000,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid payment amount/i);
  });

  it("rejects claimed amount below required", async () => {
    const result = await verifyUsdcPaymentProof({
      transactionHash: TX,
      amount: "1000",
      recipient: RECIPIENT,
      requiredAmount: "10000",
      maxAgeMs: 60_000,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/less than required/i);
  });

  it("accepts a fresh successful USDC transfer to recipient", async () => {
    const value = 10000n;
    const paddedTo =
      "0x000000000000000000000000" + RECIPIENT.slice(2).toLowerCase();
    const paddedFrom =
      "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    mockGetTransactionReceipt.mockResolvedValue({
      status: "success",
      blockNumber: 1n,
      logs: [
        {
          address: USDC_TOKEN_ADDRESSES.base,
          data: `0x${value.toString(16).padStart(64, "0")}`,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            paddedFrom,
            paddedTo,
          ],
        },
      ],
    });
    mockGetBlock.mockResolvedValue({
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    });

    const result = await verifyUsdcPaymentProof({
      transactionHash: TX,
      amount: "10000",
      recipient: RECIPIENT,
      requiredAmount: "10000",
      maxAgeMs: 10 * 60 * 1000,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects stale payments", async () => {
    mockGetTransactionReceipt.mockResolvedValue({
      status: "success",
      blockNumber: 1n,
      logs: [],
    });
    mockGetBlock.mockResolvedValue({
      timestamp: BigInt(Math.floor(Date.now() / 1000) - 3600),
    });

    const result = await verifyUsdcPaymentProof({
      transactionHash: TX,
      amount: "10000",
      recipient: RECIPIENT,
      requiredAmount: "10000",
      maxAgeMs: 60_000,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too old/i);
  });
});
