/**
 * Pure gas / paymaster error classifier for MeToken trades.
 *
 * Matchers are PROVISIONAL until pinned against live G2 buy/sell failures.
 * TODO(G2): Replace/adjust rows using captured error bodies from G2 test buy.
 */

export type GasErrorPhase = 'pre_submit' | 'post_submit' | 'unknown';

export type GasErrorKind =
  | 'sponsor_policy_rejection'
  | 'insufficient_usdc_for_gas'
  | 'other';

export type ClassifiedGasError = {
  kind: GasErrorKind;
  phase: GasErrorPhase;
  /** Set when kind === sponsor_policy_rejection */
  provisionalMatcherId?: string;
};

export type ProvisionalGasErrorMatcher = {
  id: string;
  /** Human-readable doc reference (not executed) */
  source: string;
  test: (normalizedMessage: string, raw: string) => boolean;
};

/**
 * PROVISIONAL — single table for sponsor-limit / policy rejection and USDC gas signals.
 * Sources:
 * - https://www.alchemy.com/docs/wallets/troubleshooting/wallet-apis-errors
 * - https://www.alchemy.com/support/how-to-fix-gas-manager-errors
 * - @alchemy/wallet-apis prepareCalls / sendCalls (Wallet API v5 JSON-RPC errors)
 */
export const PROVISIONAL_GAS_ERROR_MATCHERS: readonly ProvisionalGasErrorMatcher[] =
  [
    {
      id: 'wallet_policy_id_not_found',
      source:
        'https://www.alchemy.com/docs/wallets/troubleshooting/wallet-apis-errors#policy-ids-not-found',
      test: (m) =>
        /policy id\(s\) not found/i.test(m) ||
        /sponsorship failed.*invalid_argument/i.test(m),
    },
    {
      id: 'wallet_sponsorship_failed',
      source:
        'https://www.alchemy.com/docs/wallets/troubleshooting/wallet-apis-errors',
      test: (m) => /sponsorship failed/i.test(m),
    },
    {
      id: 'gas_manager_max_userops',
      source:
        'https://www.alchemy.com/support/how-to-fix-gas-manager-errors',
      test: (m) =>
        /max number of userops/i.test(m) ||
        /max operations per policy/i.test(m) ||
        /sponsored the max/i.test(m),
    },
    {
      id: 'gas_manager_policy_rejected',
      source:
        'https://www.alchemy.com/support/how-to-fix-gas-manager-errors',
      test: (m) =>
        /rejected due to max/i.test(m) ||
        /policy rejected/i.test(m) ||
        /did not match policy/i.test(m) ||
        /not allowed by policy/i.test(m),
    },
    {
      id: 'gas_manager_spend_limit',
      source:
        'https://www.alchemy.com/docs/wallets/reference/gas-manager-faqs',
      test: (m) =>
        /spend limit/i.test(m) ||
        /usage limit/i.test(m) ||
        /sponsorship limit/i.test(m),
    },
    {
      id: 'wallet_onchain_paymaster_disabled',
      source:
        'https://www.alchemy.com/docs/wallets/troubleshooting/wallet-apis-errors#on-chain-paymaster-sponsorship-not-enabled',
      test: (m) => /on-chain paymaster sponsorship is not enabled/i.test(m),
    },
    {
      id: 'wallet_erc20_gas_insufficient_balance',
      source:
        'https://www.alchemy.com/docs/wallets/troubleshooting/wallet-apis-errors#erc20-transfer-amount-exceeds-balance',
      test: (m) =>
        /erc20: transfer amount exceeds balance/i.test(m) ||
        (/paying for gas with erc-20/i.test(m) && /balance/i.test(m)),
    },
    {
      id: 'wallet_precheck_sender_balance',
      source:
        'https://www.alchemy.com/docs/wallets/troubleshooting/wallet-apis-errors#precheck-failed-sender-balance',
      test: (m) =>
        /precheck failed: sender balance/i.test(m) &&
        !/policy id/i.test(m),
    },
  ] as const;

const PRE_SUBMIT_MARKERS = [
  /precheck failed/i,
  /wallet_preparecalls/i,
  /preparecalls/i,
  /sponsorship failed/i,
  /policy id/i,
  /gas manager/i,
  /paymaster/i,
  /max number of userops/i,
  /-32600/,
  /-32602/,
  /-32000/,
  /-32521/,
  /-32500/,
  /invalid_argument/i,
];

const POST_SUBMIT_MARKERS = [
  /user operation reverted/i,
  /transaction reverted/i,
  /waitforuseroperation/i,
  /failed to mine/i,
  /aa50/i,
  /aa51/i,
];

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function inferGasErrorPhase(
  message: string,
  options?: { userOpHash?: string | null },
): GasErrorPhase {
  if (options?.userOpHash) return 'post_submit';
  const m = message.toLowerCase();
  if (POST_SUBMIT_MARKERS.some((re) => re.test(m))) return 'post_submit';
  if (PRE_SUBMIT_MARKERS.some((re) => re.test(m))) return 'pre_submit';
  return 'unknown';
}

export function classifyGasError(
  error: unknown,
  options?: { userOpHash?: string | null },
): ClassifiedGasError {
  const raw = normalizeErrorMessage(error);
  const normalized = raw.toLowerCase();
  const phase = inferGasErrorPhase(raw, options);

  for (const matcher of PROVISIONAL_GAS_ERROR_MATCHERS) {
    if (
      matcher.id === 'wallet_erc20_gas_insufficient_balance' ||
      matcher.id === 'wallet_precheck_sender_balance'
    ) {
      continue;
    }
    if (matcher.test(normalized, raw)) {
      return {
        kind: 'sponsor_policy_rejection',
        phase,
        provisionalMatcherId: matcher.id,
      };
    }
  }

  const usdcMatcher = PROVISIONAL_GAS_ERROR_MATCHERS.find(
    (m) => m.id === 'wallet_erc20_gas_insufficient_balance',
  );
  if (usdcMatcher?.test(normalized, raw)) {
    return { kind: 'insufficient_usdc_for_gas', phase };
  }

  const precheckMatcher = PROVISIONAL_GAS_ERROR_MATCHERS.find(
    (m) => m.id === 'wallet_precheck_sender_balance',
  );
  if (precheckMatcher?.test(normalized, raw)) {
    return { kind: 'insufficient_usdc_for_gas', phase };
  }

  return { kind: 'other', phase };
}

/**
 * Opt-in USDC fallback: only when a provisional sponsor/policy matcher matched
 * and the failure is clearly pre-submit (never on unknown/unclassified errors).
 */
export function isSponsorFallbackEligible(
  error: unknown,
  options?: { userOpHash?: string | null },
): boolean {
  if (options?.userOpHash) return false;
  const classified = classifyGasError(error, options);
  if (classified.kind !== 'sponsor_policy_rejection') return false;
  if (classified.phase !== 'pre_submit') return false;
  return Boolean(classified.provisionalMatcherId);
}

export function isInsufficientUsdcForGasError(error: unknown): boolean {
  return classifyGasError(error).kind === 'insufficient_usdc_for_gas';
}
