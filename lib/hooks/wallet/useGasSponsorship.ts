"use client";

import { useCallback } from "react";
import { useIsMember } from "../unlock/useIsMember";
import { buildSponsoredAttestationGasContext } from "@/lib/eas/attestation-gas";
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
    };
}

export function useGasSponsorship() {
    const { isMember, isVerified, isLoading: isMembershipLoading } = useIsMember();

    // Strip quotes from environment variables (they may have quotes in .env.local)
    const SPONSORED_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID?.replace(/^["']|["']$/g, '');
    const USDC_POLICY_ID = process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID?.replace(/^["']|["']$/g, '');
    const STORY_POLICY_ID = process.env.NEXT_PUBLIC_STORY_POLICY_ID?.replace(/^["']|["']$/g, '');

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
            sponsoredPolicyId: SPONSORED_POLICY_ID,
            usdcPolicyId: USDC_POLICY_ID,
        });
    };

    /**
     * Returns gas context for Story Protocol UserOperations.
     * Use when sending a UserOp on Story chain so Alchemy sponsors gas via NEXT_PUBLIC_STORY_POLICY_ID.
     * When set, you do not need STORY_PROTOCOL_PRIVATE_KEY to pay gas for Story deploy/interactions.
     */
    const getStoryGasContext = (): { context: GasSponsorshipContext | undefined; isSponsored: boolean } => {
        if (STORY_POLICY_ID) {
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
