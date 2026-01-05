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

    const SPONSORED_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID;
    const USDC_POLICY_ID = process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID;

    /**
     * Returns the appropriate UserOperation context based on membership status and target payment method.
     * 
     * @param preferredMethod 'sponsored' | 'usdc' - Default preference if not member (usually 'usdc')
     */
    const getGasContext = (preferredMethod: 'sponsored' | 'usdc' = 'usdc'): { context: GasSponsorshipContext | undefined, isSponsored: boolean } => {

        // 1. Members get Full Sponsorship
        if (isMember && SPONSORED_POLICY_ID) {
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
