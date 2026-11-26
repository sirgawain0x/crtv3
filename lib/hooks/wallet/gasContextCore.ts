import type { TradeGasContextResult } from "@/lib/hooks/metokens/tradeGasContext";
import { buildErc20PaymasterConfig } from "@/lib/wallet/usdc-gas";

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
        // Include the spend ceiling and auto-approve: an ERC-20 capability
        // without maxTokenAmount leaves the paymaster free to charge unbounded.
        erc20: buildErc20PaymasterConfig(USDC_ADDRESS),
      },
      isSponsored: false,
    };
  }

  return { context: undefined, isSponsored: false };
}
