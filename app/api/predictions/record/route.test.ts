import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("viem", () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  getAddress: (value: string) => value.toLowerCase(),
}));

const USER = "0x1111111111111111111111111111111111111111";
const TX = "0x" + "b".repeat(64);

const mockRequireWalletAuthFor = vi.fn();
const mockVerifyPredictionCreationTx = vi.fn();
const mockGetAllMemberships = vi.fn();
const mockCountPredictionMarketsThisMonthUtc = vi.fn();
const mockInsert = vi.fn();

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(async () => ({ isBot: false })),
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { generous: vi.fn(async () => null) },
}));

vi.mock("@/lib/auth/require-wallet", () => ({
  requireWalletAuthFor: (...args: unknown[]) => mockRequireWalletAuthFor(...args),
  WalletAuthError: class WalletAuthError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WalletAuthError";
    }
  },
}));

vi.mock("@/lib/chain/verifyTransactionReceipt", () => ({
  TransactionVerificationError: class TransactionVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "TransactionVerificationError";
    }
  },
}));

vi.mock("@/lib/predictions/verifyPredictionCreationTx", () => ({
  verifyPredictionCreationTx: (...args: unknown[]) => mockVerifyPredictionCreationTx(...args),
}));

vi.mock("@/lib/sdk/unlock/services", () => ({
  unlockService: {
    getAllMemberships: (...args: unknown[]) => mockGetAllMemberships(...args),
  },
}));

vi.mock("@/lib/predictions/prediction-quota", () => ({
  countPredictionMarketsThisMonthUtc: (...args: unknown[]) =>
    mockCountPredictionMarketsThisMonthUtc(...args),
  getPremiumPredictionAccess: () => ({ unlimited: false, premiumTier: null }),
  normalizeCreatorAddress: (address: string) => address.toLowerCase(),
  PREDICTION_MARKETS_MONTHLY_LIMIT: 3,
}));

vi.mock("@/lib/access/platform-admin", () => ({
  isPlatformAdmin: () => false,
}));

vi.mock("@/lib/access/creator-membership", () => ({
  hasValidCreatorPass: () => false,
}));

vi.mock("@/lib/sdk/supabase/service", () => ({
  supabaseService: {
    from: () => ({
      insert: mockInsert,
    }),
  },
}));

import { POST } from "./route";

function recordRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/predictions/record", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("predictions/record POST security", () => {
  beforeEach(() => {
    mockRequireWalletAuthFor.mockResolvedValue({ address: USER });
    mockVerifyPredictionCreationTx.mockResolvedValue({
      questionId: "0x" + "c".repeat(64),
      creatorAddress: USER,
      transactionHash: TX,
    });
    mockGetAllMemberships.mockResolvedValue([]);
    mockCountPredictionMarketsThisMonthUtc.mockResolvedValue(0);
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without wallet auth", async () => {
    const { WalletAuthError } = await import("@/lib/auth/require-wallet");
    mockRequireWalletAuthFor.mockRejectedValue(new WalletAuthError(401, "Missing wallet auth"));

    const res = await POST(recordRequest({ address: USER, transactionHash: TX }));
    expect(res.status).toBe(401);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 when tx verification fails", async () => {
    const { TransactionVerificationError } = await import("@/lib/chain/verifyTransactionReceipt");
    mockVerifyPredictionCreationTx.mockRejectedValue(
      new TransactionVerificationError("No valid Reality.eth question creation found in transaction"),
    );

    const res = await POST(recordRequest({ address: USER, transactionHash: TX }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Reality.eth");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("records quota usage when verification succeeds", async () => {
    const res = await POST(recordRequest({
      address: USER,
      transactionHash: TX,
      title: "Test market",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.recorded).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });
});
