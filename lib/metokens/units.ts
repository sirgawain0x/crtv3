/**
 * Unit helpers for MeToken market data.
 *
 * The `metokens.total_supply` column is legacy-mixed: older rows (and the daily
 * cron) store an 18-decimal wei string such as "8157198948020651867", while some
 * writers store whole tokens such as 8.157. Everything downstream (price, 24h
 * change, charts) needs whole tokens, so normalise in one place instead of
 * scattering `formatEther` calls.
 *
 * `metoken_transactions.amount` and `.collateral_amount` are already whole units
 * (tokens / stablecoin USD) and must NOT be passed through `formatEther`.
 */
import { formatEther } from 'viem';
import { dbMetokenTotalSupplyToWei } from '@/lib/utils/metoken-units';

/** Keep supply conversion aligned with the application's existing DB conventions. */
export function meTokenSupplyToHuman(value: number | string | null | undefined): number {
  return Number(formatEther(dbMetokenTotalSupplyToWei(value)));
}

/** Coerce a database numeric/text value to a finite number (0 on bad input). */
export function toFiniteNumber(value: unknown): number {
  const raw = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

/** Price per MeToken given vault TVL in USD and supply in tokens. */
export function priceFromTvl(tvlUsd: number, supplyTokens: number): number {
  return supplyTokens > 0 ? tvlUsd / supplyTokens : 0;
}
