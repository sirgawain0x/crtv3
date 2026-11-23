import type { UserClaimStatus } from './claim-status';

export function hasIndexedAnswer(input: { lastBond: unknown; finalizeTs: unknown }): boolean {
  try {
    return BigInt(String(input.lastBond ?? 0)) > 0n || BigInt(String(input.finalizeTs ?? 0)) > 0n;
  } catch {
    return false;
  }
}

/** An estimated expiry is not confirmation that an oracle has a final answer. */
export function isPredictionResolutionConfirmed(input: {
  finalizeTs: number;
  now: number;
  isPendingArbitration: boolean;
  hasAnswer: boolean;
  claimStatus?: UserClaimStatus;
}): boolean {
  if (input.isPendingArbitration) return false;
  if (input.claimStatus && input.claimStatus !== 'not_participant') return true;
  return input.hasAnswer && Number.isFinite(input.finalizeTs) &&
    input.finalizeTs > 0 && input.finalizeTs <= input.now;
}
