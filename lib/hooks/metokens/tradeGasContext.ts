import { unlockService } from "@/lib/sdk/unlock/services";

export type TradeGasSponsorshipContext = {
  paymasterService?: { policyId: string };
  erc20?: { tokenAddress: string };
};

export type TradeGasContextResult = {
  context: TradeGasSponsorshipContext | undefined;
  isSponsored: boolean;
};

/** Debug payload for buy/sell gas resolution (uses awaited membership, not hook cache). */
export function buildTradeGasLogFields(
  memberForGas: boolean,
  gasContext: TradeGasSponsorshipContext | undefined,
  isSponsored: boolean,
) {
  return {
    gasContext,
    memberForGas,
    isSponsored,
    hasPolicyId: !!gasContext?.paymasterService?.policyId,
    policyId: gasContext?.paymasterService?.policyId,
    tokenAddress: gasContext?.erc20?.tokenAddress,
  };
}

export type GetTradeGasContextOptions = {
  isMember?: boolean;
};

export type GetTradeGasContextFn = (
  preferredMethod: "sponsored" | "usdc" | "eth",
  options?: GetTradeGasContextOptions,
) => TradeGasContextResult;

/** Resolve buy/sell gas policy once membership is known. */
export function resolveTradeGasContextForMembership(
  isMember: boolean,
  getGasContext: GetTradeGasContextFn,
  onSponsoredFallback?: () => void,
): TradeGasContextResult {
  if (isMember) {
    const sponsored = getGasContext("sponsored", { isMember: true });
    if (sponsored.context) {
      return sponsored;
    }
    onSponsoredFallback?.();
  }
  return getGasContext("usdc", { isMember: false });
}

export async function fetchMembershipForGas(
  walletAddress: string,
): Promise<boolean> {
  try {
    const memberships = await unlockService.getAllMemberships(walletAddress);
    return memberships.some(({ isValid }) => isValid);
  } catch {
    return false;
  }
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
  if (!membership.isLoading && !membership.isVerified) {
    return false;
  }
  return fetchMembershipForGas(walletAddress);
}
