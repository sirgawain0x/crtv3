import type { TradeGasContextResult } from "@/lib/hooks/metokens/tradeGasContext";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export type GasContextPolicies = {
  sponsoredPolicyId?: string;
  usdcPolicyId?: string;
};

export function resolveGasContextForMethod(
  preferredMethod: "sponsored" | "usdc" | "eth",
  isMember: boolean,
  policies: GasContextPolicies,
): TradeGasContextResult {
  const { sponsoredPolicyId, usdcPolicyId } = policies;

  if (preferredMethod === "eth") {
    return { context: undefined, isSponsored: false };
  }

  if (preferredMethod === "sponsored" && sponsoredPolicyId) {
    if (isMember) {
      return {
        context: {
          paymasterService: { policyId: sponsoredPolicyId },
        },
        isSponsored: true,
      };
    }
  }

  if (usdcPolicyId && preferredMethod === "usdc") {
    return {
      context: {
        paymasterService: { policyId: usdcPolicyId },
        erc20: { tokenAddress: USDC_ADDRESS },
      },
      isSponsored: false,
    };
  }

  return { context: undefined, isSponsored: false };
}
