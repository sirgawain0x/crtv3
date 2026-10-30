import { parseEther } from 'viem';

/** Values at or above this (wei) are treated as on-chain raw units, not human token counts. */
const WEI_LIKE_THRESHOLD = 1_000_000_000_000n;

/**
 * Convert a Supabase NUMERIC (human tokens or wei string) to wei bigint.
 * MeToken transaction `amount` values are stored as human-readable tokens (see verifyMeTokenTransaction).
 * `total_supply` is usually stored as a wei integer string from chain sync.
 */
export function dbNumericToWei(value: number | string | null | undefined): bigint {
  if (value === null || value === undefined || value === '') {
    return 0n;
  }

  const str = String(value).trim();
  if (str === '' || str === '0') {
    return 0n;
  }

  if (!str.includes('.')) {
    try {
      const asBig = BigInt(str);
      if (asBig >= WEI_LIKE_THRESHOLD) {
        return asBig;
      }
      return parseEther(str);
    } catch {
      return parseEther(str as `${number}`);
    }
  }

  return parseEther(str as `${number}`);
}
