import { beforeEach, describe, expect, it, vi } from "vitest";

const { readContract, maybeSingle } = vi.hoisted(() => ({
  readContract: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@account-kit/infra", () => ({
  alchemy: () => ({}),
  base: { id: 8453 },
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({ readContract }),
  };
});

vi.mock("@/lib/sdk/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

import {
  checkMeTokenAccess,
  isMeTokenGateActive,
} from "./metoken-access";

describe("isMeTokenGateActive", () => {
  it("is active when requires_metoken is true regardless of price", () => {
    expect(isMeTokenGateActive(true, null)).toBe(true);
    expect(isMeTokenGateActive(true, undefined)).toBe(true);
    expect(isMeTokenGateActive(true, 0)).toBe(true);
    expect(isMeTokenGateActive(true, 2)).toBe(true);
  });

  it("is inactive when requires_metoken is false", () => {
    expect(isMeTokenGateActive(false, null)).toBe(false);
    expect(isMeTokenGateActive(false, 5)).toBe(false);
    expect(isMeTokenGateActive(null, 1)).toBe(false);
  });
});

describe("checkMeTokenAccess", () => {
  const creator = "0x00000000000000000000000000000000000000c1";
  const viewer = "0x00000000000000000000000000000000000000b1";

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({
      data: { address: creator, symbol: "TST", name: "Test" },
      error: null,
    });
    readContract.mockResolvedValue(BigInt("2000000000000000000"));
  });

  it("allows creator bypass without on-chain holder checks", async () => {
    const result = await checkMeTokenAccess({
      viewerAddresses: [creator],
      creatorAddress: creator,
      requiredAmount: null,
    });
    expect(result).toEqual({ allowed: true, reason: "creator_bypass" });
    expect(readContract).not.toHaveBeenCalled();
  });

  it.each([null, 0, "0"] as const)(
    "allows holders with a positive balance when gated price is %s",
    async (requiredAmount) => {
      const result = await checkMeTokenAccess({
        viewerAddresses: [viewer],
        creatorAddress: creator,
        requiredAmount,
      });
      expect(result.allowed).toBe(true);
      expect(readContract).toHaveBeenCalled();
    },
  );

  it.each([null, 0, "0"] as const)(
    "denies a zero balance when gated price is %s",
    async (requiredAmount) => {
      readContract.mockResolvedValue(BigInt(0));
      const result = await checkMeTokenAccess({
        viewerAddresses: [viewer],
        creatorAddress: creator,
        requiredAmount,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("insufficient_balance");
    },
  );

  it("denies unparsable gate prices without on-chain checks", async () => {
    const result = await checkMeTokenAccess({
      viewerAddresses: [viewer],
      creatorAddress: creator,
      requiredAmount: "not-a-number",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("insufficient_balance");
    expect(readContract).not.toHaveBeenCalled();
  });

  it("denies when no viewer address is provided", async () => {
    const result = await checkMeTokenAccess({
      viewerAddresses: [],
      creatorAddress: creator,
      requiredAmount: 1,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_viewer_address");
  });

  it("grants access when balance meets a positive requirement", async () => {
    const result = await checkMeTokenAccess({
      viewerAddresses: [viewer],
      creatorAddress: creator,
      requiredAmount: 1,
    });
    expect(result.allowed).toBe(true);
    expect(readContract).toHaveBeenCalled();
  });

  it("denies when balance is below a positive requirement", async () => {
    readContract.mockResolvedValue(BigInt("500000000000000000"));
    const result = await checkMeTokenAccess({
      viewerAddresses: [viewer],
      creatorAddress: creator,
      requiredAmount: 1,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("insufficient_balance");
  });
});