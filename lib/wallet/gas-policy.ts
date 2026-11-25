/**
 * Who pays gas, decided in one place.
 *
 * Current product rule: **everyone pays gas in USDC.** Free gas is off by
 * default and only returns behind an explicit opt-in plus a membership check,
 * because unrestricted sponsorship bills the app owner for every user
 * operation (it ran at ~$70-80 before this switch).
 *
 * These flags are app-side circuit breakers only. The real spend control is the
 * Alchemy Gas Manager policy (ERC-20 policy type + spend caps). A modified
 * client can always ask for sponsorship; the paymaster must refuse it.
 */

export type GasPaymentMode = "usdc" | "sponsored" | "eth";

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  const normalized = value?.trim().replace(/^["']|["']$/g, "").toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return defaultValue;
}

/**
 * Free gas for members. Off unless explicitly enabled.
 *
 * Keep this false while the product charges everyone in USDC. When membership
 * gas allowances ship, this becomes the master switch in front of the per-user
 * monthly budget.
 */
export function isGasSponsorshipEnabled(): boolean {
  return envFlag(process.env.NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED, false);
}

/**
 * Users pay gas in USDC. **On by default** — the flag now only exists so gas
 * can be paused in an emergency (`NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED=false`).
 */
export function isUsdcGasPaymentEnabled(): boolean {
  return envFlag(process.env.NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED, true);
}

/**
 * Strips the paymaster capabilities a mode is not allowed to use.
 *
 * Handles both the legacy `paymasterService` key and the Wallet API `paymaster`
 * capability; a request is treated as user-paid when it carries `erc20`
 * anywhere, because that is what tells Alchemy to charge the user's USDC.
 */
export function limitGasCapabilities(
  capabilities?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!capabilities) return undefined;
  const result = { ...capabilities };
  const paymaster = result.paymaster as { erc20?: unknown } | undefined;
  const userPays = Boolean(result.erc20 || paymaster?.erc20);
  const allowed = userPays ? isUsdcGasPaymentEnabled() : isGasSponsorshipEnabled();
  if (!allowed) {
    delete result.paymaster;
    delete result.paymasterService;
    delete result.erc20;
  }
  return Object.keys(result).length ? result : undefined;
}

export type GasModeDecision = {
  mode: GasPaymentMode;
  isSponsored: boolean;
  reason: string;
};

/**
 * Resolve the mode to use for one send.
 *
 * `requested` is a hint, not a grant: sponsorship still needs the master switch
 * and membership. Anything else falls back to USDC, then to ETH when no USDC
 * policy is configured.
 */
export function resolveGasPaymentMode(params: {
  requested?: GasPaymentMode;
  isMember?: boolean;
  hasSponsoredPolicy?: boolean;
  hasUsdcPolicy?: boolean;
}): GasModeDecision {
  const { requested = "usdc", isMember = false, hasSponsoredPolicy = false, hasUsdcPolicy = false } = params;

  if (requested === "eth") {
    return { mode: "eth", isSponsored: false, reason: "explicit ETH request" };
  }

  if (requested === "sponsored") {
    if (!isGasSponsorshipEnabled()) {
      return {
        mode: hasUsdcPolicy ? "usdc" : "eth",
        isSponsored: false,
        reason: "sponsorship disabled by NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED",
      };
    }
    if (!isMember) {
      return {
        mode: hasUsdcPolicy ? "usdc" : "eth",
        isSponsored: false,
        reason: "sponsorship requires an active membership",
      };
    }
    if (!hasSponsoredPolicy) {
      return { mode: "eth", isSponsored: false, reason: "no sponsorship policy configured" };
    }
    return { mode: "sponsored", isSponsored: true, reason: "member sponsorship" };
  }

  if (isUsdcGasPaymentEnabled() && hasUsdcPolicy) {
    return { mode: "usdc", isSponsored: false, reason: "user pays gas in USDC" };
  }

  return {
    mode: "eth",
    isSponsored: false,
    reason: isUsdcGasPaymentEnabled() ? "no USDC gas policy configured" : "USDC gas payments disabled",
  };
}
