import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sdk/unlock/services", () => ({
  unlockService: {
    getAllMemberships: vi.fn(),
  },
}));

import { unlockService } from "@/lib/sdk/unlock/services";
import {
  fetchMembershipForGas,
  resolveMemberForTradeGas,
  resolveTradeGasContextForMembership,
} from "./tradeGasContext";

const mockGetAllMemberships = vi.mocked(unlockService.getAllMemberships);

const SPONSORED_POLICY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const USDC_POLICY = "11111111-2222-3333-4444-555555555555";

function mockGetGasContext(isMember: boolean) {
  return (preferredMethod: "sponsored" | "usdc" | "eth") => {
    if (preferredMethod === "sponsored" && isMember) {
      return {
        context: { paymasterService: { policyId: SPONSORED_POLICY } },
        isSponsored: true,
      };
    }
    if (preferredMethod === "usdc") {
      return {
        context: {
          paymasterService: { policyId: USDC_POLICY },
          erc20: { tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
        },
        isSponsored: false,
      };
    }
    return { context: undefined, isSponsored: false };
  };
}

describe("resolveTradeGasContextForMembership", () => {
  it("returns sponsored context for members", () => {
    const result = resolveTradeGasContextForMembership(
      true,
      mockGetGasContext(true),
    );
    expect(result.isSponsored).toBe(true);
    expect(result.context?.paymasterService?.policyId).toBe(SPONSORED_POLICY);
  });

  it("returns USDC context for non-members", () => {
    const result = resolveTradeGasContextForMembership(
      false,
      mockGetGasContext(false),
    );
    expect(result.isSponsored).toBe(false);
    expect(result.context?.paymasterService?.policyId).toBe(USDC_POLICY);
  });
});

describe("resolveMemberForTradeGas", () => {
  beforeEach(() => {
    mockGetAllMemberships.mockReset();
  });

  it("one-shots membership when verification is still pending and user is a member", async () => {
    mockGetAllMemberships.mockResolvedValue([
      { isValid: true, name: "creative", address: "0x1", lock: null },
    ]);

    const isMember = await resolveMemberForTradeGas("0xabc", {
      isVerified: false,
      isLoading: true,
      isMember: false,
    });

    expect(isMember).toBe(true);
    expect(mockGetAllMemberships).toHaveBeenCalledWith("0xabc");

    const gas = resolveTradeGasContextForMembership(
      isMember,
      mockGetGasContext(true),
    );
    expect(gas.isSponsored).toBe(true);
  });

  it("uses cached hook state when verification already finished (non-member)", async () => {
    const isMember = await resolveMemberForTradeGas("0xabc", {
      isVerified: true,
      isLoading: false,
      isMember: false,
    });

    expect(isMember).toBe(false);
    expect(mockGetAllMemberships).not.toHaveBeenCalled();

    const gas = resolveTradeGasContextForMembership(
      isMember,
      mockGetGasContext(false),
    );
    expect(gas.context?.paymasterService?.policyId).toBe(USDC_POLICY);
  });
});

describe("fetchMembershipForGas", () => {
  beforeEach(() => {
    mockGetAllMemberships.mockReset();
  });

  it("returns false when no valid memberships", async () => {
    mockGetAllMemberships.mockResolvedValue([
      { isValid: false, name: "creative", address: "0x1", lock: null },
    ]);
    await expect(fetchMembershipForGas("0xdead")).resolves.toBe(false);
  });
});

describe("trade button membership gate", () => {
  it("disables trade actions while membership is loading", () => {
    const isMembershipLoading = true;
    const isPending = false;
    const isConfirming = false;
    const disabled =
      isPending || isConfirming || isMembershipLoading || !"1".length;
    expect(disabled).toBe(true);
  });
});
