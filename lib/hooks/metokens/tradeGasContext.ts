import { unlockService } from "@/lib/sdk/unlock/services";

export type TradeGasSponsorshipContext = {
  paymasterService?: { policyId: string };
  erc20?: { tokenAddress: string };
};

export type TradeGasContextResult = {
  context: TradeGasSponsorshipContext | undefined;
  isSponsored: boolean;
};

export type GetTradeGasContextFn = (
  preferredMethod: "sponsored" | "usdc" | "eth",
) => TradeGasContextResult;

/** Resolve buy/sell gas policy once membership is known. */
export function resolveTradeGasContextForMembership(
  isMember: boolean,
  getGasContext: GetTradeGasContextFn,
  onSponsoredFallback?: () => void,
): TradeGasContextResult {
  if (isMember) {
    const sponsored = getGasContext("sponsored");
    if (sponsored.context) {
      return sponsored;
    }
    onSponsoredFallback?.();
  }
  return getGasContext("usdc");
}

export async function fetchMembershipForGas(
  walletAddress: string,
): Promise<boolean> {
  const memberships = await unlockService.getAllMemberships(walletAddress);
  return memberships.some(({ isValid }) => isValid);
}

export type MembershipHookSnapshot = {
  isVerified: boolean;
  isLoading: boolean;
  isMember: boolean;
};

/**
 * Use cached hook membership when verification finished; otherwise one-shot unlock check.
 */
export async function resolveMemberForTradeGas(
  walletAddress: string,
  membership: MembershipHookSnapshot,
): Promise<boolean> {
  if (membership.isVerified && !membership.isLoading) {
    return membership.isMember;
  }
  return fetchMembershipForGas(walletAddress);
}
