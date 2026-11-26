"use client";

import { useCallback } from "react";
import { useIsMember } from "../unlock/useIsMember";
import { buildSponsoredAttestationGasContext } from "@/lib/eas/attestation-gas";
import { isGasSponsorshipEnabled, isUsdcGasPaymentEnabled } from "@/lib/wallet/gas-policy";
import { buildMeTokenCreationGasContext } from "@/lib/metokens/metoken-gas";
import {
  resolveMemberForTradeGas,
  resolveTradeGasContextForMembership,
  type GetTradeGasContextFn,
} from "@/lib/hooks/metokens/tradeGasContext";
import { resolveGasContextForMethod } from "@/lib/hooks/wallet/gasContextCore";

interface GasSponsorshipContext {
  paymasterService?: {
    policyId: string;
  };
  erc20?: {
    tokenAddress: string;
    maxTokenAmount?: bigint;
    postOpSettings?: { autoApprove?: boolean };
  };
}

function stripQuotes(value?: string): string | undefined {
  const trimmed = value?.replace(/^["']|["']$/g, "").trim();
  return trimmed || undefined;
}

export function useGasSponsorship() {
    const { isMember, isVerified, isLoading: isMembershipLoading } = useIsMember();

  const SPONSORED_POLICY_ID = stripQuotes(process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID);
  // Separate policy: an ERC-20 ("any token") policy that charges the user in USDC.
  const USDC_POLICY_ID = stripQuotes(process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID);
  const STORY_POLICY_ID = stripQuotes(process.env.NEXT_PUBLIC_STORY_POLICY_ID);

    /**
     * Returns the appropriate UserOperation context based on membership status and target payment method.
     * 
     * @param preferredMethod 'sponsored' | 'usdc' | 'eth' - Explicitly requested gas payment method
     */
    const getGasContext = (
        preferredMethod: 'sponsored' | 'usdc' | 'eth' = 'usdc',
        options?: { isMember?: boolean },
    ): { context: GasSponsorshipContext | undefined, isSponsored: boolean } => {
        const memberForContext = options?.isMember ?? isMember;

        console.log('🔧 useGasSponsorship.getGasContext called:', {
            isMember: memberForContext,
            preferredMethod,
            hasSponsoredPolicy: !!SPONSORED_POLICY_ID,
            hasUsdcPolicy: !!USDC_POLICY_ID,
            hasStoryPolicy: !!STORY_POLICY_ID,
        });

        return resolveGasContextForMethod(preferredMethod, memberForContext, {
            sponsoredPolicyId: isGasSponsorshipEnabled() ? SPONSORED_POLICY_ID : undefined,
            usdcPolicyId: isUsdcGasPaymentEnabled() ? USDC_POLICY_ID : undefined,
        });
    };

    /**
     * Returns gas context for Story Protocol UserOperations.
     * Use when sending a UserOp on Story chain so Alchemy sponsors gas via NEXT_PUBLIC_STORY_POLICY_ID.
     * When set, you do not need STORY_PROTOCOL_PRIVATE_KEY to pay gas for Story deploy/interactions.
     */
    const getStoryGasContext = (): { context: GasSponsorshipContext | undefined; isSponsored: boolean } => {
        if (isGasSponsorshipEnabled() && STORY_POLICY_ID) {
            return {
                context: {
                    paymasterService: { policyId: STORY_POLICY_ID },
                },
                isSponsored: true,
            };
        }
        return { context: undefined, isSponsored: false };
    };

    /**
     * Returns a fully-sponsored gas context for EAS attestation UserOperations on Base.
     * Uses NEXT_PUBLIC_ATTESTATION_SPONSORED_POLICY_ID, then repo default, then general paymaster policy.
     */
    const getAttestationGasContext = (): { context: GasSponsorshipContext | undefined; isSponsored: boolean } => {
        const sponsored = buildSponsoredAttestationGasContext();
        if (sponsored.context) {
            return { context: sponsored.context, isSponsored: sponsored.isSponsored };
        }
        return { context: undefined, isSponsored: false };
    };

    /**
     * ETH-sponsored paymaster for MeToken creation (not USDC any-token policy).
     * Uses NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID for all users.
     */
    const getMeTokenCreationGasContext = () => buildMeTokenCreationGasContext();

    const resolveTradeGasContext = useCallback(
        (memberOverride?: boolean) => {
            const member = memberOverride ?? isMember;
            return resolveTradeGasContextForMembership(
                member,
                getGasContext as GetTradeGasContextFn,
            );
        },
        [getGasContext, isMember],
    );

    const resolveMemberForTrade = useCallback(
        (walletAddress: string) =>
            resolveMemberForTradeGas(walletAddress, {
                isVerified,
                isLoading: isMembershipLoading,
                isMember,
            }),
        [isMember, isMembershipLoading, isVerified],
    );

    return {
        getGasContext,
        getMeTokenCreationGasContext,
        getStoryGasContext,
        getAttestationGasContext,
        isMember,
        isMembershipLoading,
        isVerified,
        resolveTradeGasContext,
        resolveMemberForTrade,
    };
}
