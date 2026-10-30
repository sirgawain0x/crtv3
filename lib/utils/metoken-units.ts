import { parseEther } from 'viem';

/**
 * Column unit conventions (writers):
 *
 * metoken_transactions.amount — human MeToken units (18-decimal tokens as decimal numbers).
 *   Writers: verifyMeTokenTransaction → POST /api/metokens/[address]/transactions,
 *   useMeTokensSupabase record paths, create-metoken edge collateral logging.
 *
 * metokens.total_supply — EITHER wei integer string OR human token amount:
 *   - Wei string: syncMeTokenMarketData, market sync cron, fresh/bulk chain reads persisted.
 *   - Human decimal: app/api/metokens/sync (Number(formatEther(...))), alchemy create, POST /api/metokens body.
 */

const MAX_ETHER_DECIMALS = 18;

/** Never throws; returns 0n on invalid input. */
export function decimalStringToWei(raw: string): bigint {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '0') {
    return 0n;
  }

  try {
    if (/^[+-]?\d+$/.test(trimmed)) {
      return BigInt(trimmed);
    }

    const normalized = normalizeDecimalTokenString(trimmed);
    if (!normalized) {
      return 0n;
    }
    return parseEther(normalized as `${number}`);
  } catch {
    return 0n;
  }
}

function normalizeDecimalTokenString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[+-]?\d+$/.test(trimmed)) {
    return trimmed;
  }

  if (/^[+-]?\d*\.\d+$/.test(trimmed)) {
    return trimFraction(trimmed);
  }

  if (/^[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num === 0) {
      return num === 0 ? '0' : null;
    }
    const fixed = num.toFixed(MAX_ETHER_DECIMALS);
    return trimFraction(fixed);
  }

  return null;
}

function trimFraction(value: string): string {
  if (!value.includes('.')) return value;
  const [whole, frac = ''] = value.split('.');
  const trimmedFrac = frac.replace(/0+$/, '');
  return trimmedFrac.length > 0 ? `${whole}.${trimmedFrac}` : whole;
}

/** Human MeToken token amount from metoken_transactions.amount */
export function dbMeTokenTransactionAmountToWei(
  value: number | string | null | undefined
): bigint {
  if (value === null || value === undefined || value === '') {
    return 0n;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0n;
    return decimalStringToWei(String(value));
  }
  return decimalStringToWei(value);
}

/**
 * metokens.total_supply — integer-only values are wei strings; fractional/scientific values are human tokens.
 */
export function dbMetokenTotalSupplyToWei(
  value: number | string | null | undefined
): bigint {
  if (value === null || value === undefined || value === '') {
    return 0n;
  }

  const str = typeof value === 'number' ? String(value) : value.trim();
  if (!str || str === '0') {
    return 0n;
  }

  if (/^\d+$/.test(str)) {
    return BigInt(str);
  }

  return dbMeTokenTransactionAmountToWei(str);
}

/** @deprecated Use dbMeTokenTransactionAmountToWei or dbMetokenTotalSupplyToWei */
export function dbNumericToWei(value: number | string | null | undefined): bigint {
  return dbMeTokenTransactionAmountToWei(value);
}
