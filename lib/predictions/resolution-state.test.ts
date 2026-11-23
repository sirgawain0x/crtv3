import { describe, expect, it } from 'vitest';
import { hasIndexedAnswer, isPredictionResolutionConfirmed } from './resolution-state';
const input = { finalizeTs: 0, now: 1000, isPendingArbitration: false, hasAnswer: true };
describe('prediction resolution confirmation', () => {
  it('does not mistake an indexer default answer and creation timestamp for a submitted answer', () => {
    expect(hasIndexedAnswer({ lastBond: '0', finalizeTs: null })).toBe(false);
    expect(hasIndexedAnswer({ lastBond: '1', finalizeTs: null })).toBe(true);
    expect(hasIndexedAnswer({ lastBond: '0', finalizeTs: '500' })).toBe(true);
  });
  it('does not resolve a question from an inferred expired timer or a non-participant status', () => {
    expect(isPredictionResolutionConfirmed(input)).toBe(false);
    expect(isPredictionResolutionConfirmed({ ...input, claimStatus: 'not_participant' })).toBe(false);
  });
  it('accepts an explicit elapsed finalization with an answer', () => {
    expect(isPredictionResolutionConfirmed({ ...input, finalizeTs: 500 })).toBe(true);
    expect(isPredictionResolutionConfirmed({ ...input, finalizeTs: 1500 })).toBe(false);
  });
  it('accepts a verified finalized claim status', () => {
    expect(isPredictionResolutionConfirmed({ ...input, claimStatus: 'won_withdrawable' })).toBe(true);
  });
  it('does not announce a final answer during arbitration', () => {
    expect(isPredictionResolutionConfirmed({ ...input, finalizeTs: 500, isPendingArbitration: true })).toBe(false);
  });
});
