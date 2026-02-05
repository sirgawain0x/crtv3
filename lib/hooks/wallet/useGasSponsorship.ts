"use client";

import { useIsMember } from "../unlock/useIsMember";

// Base USDC Address
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

interface GasSponsorshipContext {
    paymasterService?: {
        policyId: string;
        token?: string;
    };
}

export function useGasSponsorship() {
    const { isMember } = useIsMember();

    // Strip quotes from environment variables (they may have quotes in .env.local)
    const SPONSORED_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID?.replace(/^["']|["']$/g, '');
    const USDC_POLICY_ID = process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID?.replace(/^["']|["']$/g, '');

    /**
     * Returns the appropriate UserOperation context based on membership status and target payment method.
     * 
     * @param preferredMethod 'sponsored' | 'usdc' - Default preference if not member (usually 'usdc')
     */
    const getGasContext = (preferredMethod: 'sponsored' | 'usdc' = 'usdc'): { context: GasSponsorshipContext | undefined, isSponsored: boolean } => {

        // Debug logging
        console.log('🔧 useGasSponsorship.getGasContext called:', {
            isMember,
            preferredMethod,
            hasSponsoredPolicy: !!SPONSORED_POLICY_ID,
            hasUsdcPolicy: !!USDC_POLICY_ID,
            sponsoredPolicyId: SPONSORED_POLICY_ID?.slice(0, 8) + '...', // Log first 8 chars only
            usdcPolicyId: USDC_POLICY_ID?.slice(0, 8) + '...',
        });

        // 1. Members get Full Sponsorship
        if (isMember && SPONSORED_POLICY_ID) {
            console.log('✅ Using SPONSORED gas (member)');
            return {
                context: {
                    paymasterService: {
                        policyId: SPONSORED_POLICY_ID,
                    },
                },
                isSponsored: true
            };
        }

        // 2. Non-Members: Try USDC Policy
        if (USDC_POLICY_ID && preferredMethod === 'usdc') {
            console.log('✅ Using USDC gas payment (non-member)');
            return {
                context: {
                    paymasterService: {
                        policyId: USDC_POLICY_ID,
                        token: USDC_ADDRESS,
                    },
                },
                isSponsored: false // User pays in USDC
            };
        }

        // 3. Fallback / No Policy: Undefined context (Standard ETH payment)
        console.warn('⚠️ No gas sponsorship available - falling back to ETH payment');
        return {
            context: undefined,
            isSponsored: false
        };
    };

    return {
        getGasContext,
        isMember,
    };
}
