"use client";

import { useIsMember } from "../unlock/useIsMember";

// Base USDC Address
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

interface GasSponsorshipContext {
    paymasterService?: {
        policyId: string;
    };
    erc20?: {
        tokenAddress: string;
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
     * @param preferredMethod 'sponsored' | 'usdc' | 'eth' - Explicitly requested gas payment method
     */
    const getGasContext = (preferredMethod: 'sponsored' | 'usdc' | 'eth' = 'usdc'): { context: GasSponsorshipContext | undefined, isSponsored: boolean } => {

        // Debug logging
        console.log('🔧 useGasSponsorship.getGasContext called:', {
            isMember,
            preferredMethod,
            hasSponsoredPolicy: !!SPONSORED_POLICY_ID,
            hasUsdcPolicy: !!USDC_POLICY_ID,
        });

        // 0. Explicit ETH preference (no sponsorship)
        if (preferredMethod === 'eth') {
            console.log('✅ Using ETH gas payment (explicit request)');
            return {
                context: undefined,
                isSponsored: false
            };
        }

        // 1. Sponsored Policy (Members Only or Explicit Request if Policy Exists)
        if (preferredMethod === 'sponsored' && SPONSORED_POLICY_ID) {
            // Only allow if member OR if we want to try it anyway (though member check is usually good)
            // For now, let's respect the membership check for automatic sponsorship, 
            // but if passed explicitly as 'sponsored', maybe we should try? 
            // The original logic required membership. Let's keep it safe.
            if (isMember) {
                console.log('✅ Using SPONSORED gas (member)');
                return {
                    context: {
                        paymasterService: {
                            policyId: SPONSORED_POLICY_ID,
                        },
                    },
                    isSponsored: true
                };
            } else {
                console.warn('⚠️ Requested SPONSORED gas but user is not a member');
            }
        }

        // 2. USDC Policy
        if (USDC_POLICY_ID && preferredMethod === 'usdc') {
            console.log('✅ Using USDC gas payment');
            return {
                context: {
                    paymasterService: {
                        policyId: USDC_POLICY_ID,
                    },
                    erc20: {
                        tokenAddress: USDC_ADDRESS,
                    }
                },
                isSponsored: false // User pays in USDC, technically "sponsored" by paymaster but user pays
            };
        }

        // 3. Fallback / No Policy / ETH
        console.warn(`⚠️ Gas sponsorship for ${preferredMethod} unavailable - falling back to ETH payment`);
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
