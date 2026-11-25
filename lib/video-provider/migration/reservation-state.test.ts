import { describe, expect, it } from 'vitest';
import { readLedgerReservationState } from './reservation-state';

const source = {
  assetId: '51e1d8ff-d3ae-4f0a-918c-e0dfea796f1b',
  playbackId: 'play',
  sizeBytes: 100,
  sha256: 'a'.repeat(64),
};

describe('readLedgerReservationState', () => {
  it('returns missing without a row and routes known states', () => {
    expect(readLedgerReservationState(null, source)).toBe('missing');
    for (const state of ['failed', 'prepared', 'processing', 'importing', 'ready'] as const) {
      expect(readLedgerReservationState({
        livepeer_asset_id: source.assetId,
        livepeer_playback_id: source.playbackId,
        source_sha256: source.sha256,
        source_bytes: source.sizeBytes,
        state,
        frameworks_asset_id: null,
        frameworks_playback_id: null,
      }, source)).toBe(state);
    }
  });

  it('rejects ambiguous and mismatched evidence', () => {
    expect(() => readLedgerReservationState({
      livepeer_asset_id: source.assetId,
      livepeer_playback_id: source.playbackId,
      source_sha256: source.sha256,
      source_bytes: source.sizeBytes,
      state: 'ambiguous',
      frameworks_asset_id: 'x',
      frameworks_playback_id: 'y',
    }, source)).toThrow(/reconciliation/);
    expect(() => readLedgerReservationState({
      livepeer_asset_id: source.assetId,
      livepeer_playback_id: 'other',
      source_sha256: source.sha256,
      source_bytes: source.sizeBytes,
      state: 'failed',
      frameworks_asset_id: null,
      frameworks_playback_id: null,
    }, source)).toThrow(/evidence/);
  });
});