"use client";

import { useIsMember } from "../unlock/useIsMember";
import { buildSponsoredAttestationGasContext } from "@/lib/eas/attestation-gas";
import { buildMeTokenCreationGasContext } from "@/lib/metokens/metoken-gas";
import { resolveGasPaymentMode, type GasPaymentMode } from "@/lib/wallet/gas-policy";
import { buildErc20PaymasterConfig, USDC_ADDRESS_BASE } from "@/lib/wallet/usdc-gas";

const isDev = process.env.NODE_ENV !== "production";

interface GasSponsorshipContext {
  paymasterService?: {
    policyId: string;
  };
  erc20?: ReturnType<typeof buildErc20PaymasterConfig>;
}

function stripQuotes(value?: string): string | undefined {
  const trimmed = value?.replace(/^["']|["']$/g, "").trim();
  return trimmed || undefined;
}

export function useGasSponsorship() {
  const { isMember } = useIsMember();

  const SPONSORED_POLICY_ID = stripQuotes(process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID);
  // Separate policy: an ERC-20 ("any token") policy that charges the user in USDC.
  const USDC_POLICY_ID = stripQuotes(process.env.NEXT_PUBLIC_ANYTOKEN_POLICY_ID);
  const STORY_POLICY_ID = stripQuotes(process.env.NEXT_PUBLIC_STORY_POLICY_ID);

  /**
   * Gas context for one user operation.
   *
   * Defaults to USDC: everyone pays their own gas unless a membership allowance
   * says otherwise. `requested` is a hint — `resolveGasPaymentMode` decides.
   */
  const getGasContext = (
    requested: GasPaymentMode = "usdc",
  ): { context: GasSponsorshipContext | undefined; isSponsored: boolean } => {
    const decision = resolveGasPaymentMode({
      requested,
      isMember,
      hasSponsoredPolicy: Boolean(SPONSORED_POLICY_ID),
      hasUsdcPolicy: Boolean(USDC_POLICY_ID),
    });

    if (isDev) {
      console.log("[gas]", {
        requested,
        mode: decision.mode,
        reason: decision.reason,
        isMember,
        hasSponsoredPolicy: Boolean(SPONSORED_POLICY_ID),
        hasUsdcPolicy: Boolean(USDC_POLICY_ID),
      });
    }

    if (decision.mode === "sponsored" && SPONSORED_POLICY_ID) {
      return {
        context: { paymasterService: { policyId: SPONSORED_POLICY_ID } },
        isSponsored: true,
      };
    }

    if (decision.mode === "usdc" && USDC_POLICY_ID) {
      return {
        context: {
          paymasterService: { policyId: USDC_POLICY_ID },
          erc20: buildErc20PaymasterConfig(USDC_ADDRESS_BASE),
        },
        // The paymaster submits the call, but the user's USDC pays for it.
        isSponsored: false,
      };
    }

    return { context: undefined, isSponsored: false };
  };

  /**
   * Story chain gas. Sponsorship here follows the same master switch as Base —
   * Story deployments are not free while sponsorship is off.
   */
  const getStoryGasContext = (): { context: GasSponsorshipContext | undefined; isSponsored: boolean } => {
    const decision = resolveGasPaymentMode({
      requested: "sponsored",
      isMember,
      hasSponsoredPolicy: Boolean(STORY_POLICY_ID),
    });
    if (decision.mode !== "sponsored" || !STORY_POLICY_ID) {
      return { context: undefined, isSponsored: false };
    }
    return { context: { paymasterService: { policyId: STORY_POLICY_ID } }, isSponsored: true };
  };

  /**
   * EAS attestation gas on Base. Resolves to nothing while sponsorship is off,
   * so uploads pay their own way instead of billing the app owner.
   */
  const getAttestationGasContext = (): { context: GasSponsorshipContext | undefined; isSponsored: boolean } => {
    const sponsored = buildSponsoredAttestationGasContext();
    if (sponsored.context) {
      return { context: sponsored.context, isSponsored: sponsored.isSponsored };
    }
    return { context: undefined, isSponsored: false };
  };

  /** ETH-sponsored paymaster for MeToken creation. Off unless sponsorship is on. */
  const getMeTokenCreationGasContext = () => buildMeTokenCreationGasContext();

  return {
    getGasContext,
    getMeTokenCreationGasContext,
    getStoryGasContext,
    getAttestationGasContext,
    isMember,
  };
}
