import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FailedImportRetryError, prepareFailedImportRetry } from './failed-import-retry';

const source = {
  assetId: '51e1d8ff-d3ae-4f0a-918c-e0dfea796f1b',
  playbackId: 'play',
  sizeBytes: 100,
  sha256: 'a'.repeat(64),
};

const find = vi.fn();
const reserve = vi.fn();
const rpc = vi.fn();

vi.mock('./supabase-ledger', () => ({
  createImportLedger: () => ({ find, reserve }),
}));

const db = { rpc } as unknown as import('@supabase/supabase-js').SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
  reserve.mockResolvedValue({ state: 'prepared' });
});

describe('prepareFailedImportRetry', () => {
  it('refuses ready imports', async () => {
    find.mockResolvedValue({
      livepeer_asset_id: source.assetId,
      livepeer_playback_id: source.playbackId,
      source_sha256: source.sha256,
      source_bytes: source.sizeBytes,
      state: 'ready',
      frameworks_asset_id: 'fw',
      frameworks_playback_id: 'fw-play',
    });
    await expect(prepareFailedImportRetry(db, source)).rejects.toBeInstanceOf(FailedImportRetryError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reserves missing evidence rows', async () => {
    find.mockResolvedValueOnce(null);
    await expect(prepareFailedImportRetry(db, source)).resolves.toEqual({ action: 'reserved' });
    expect(reserve).toHaveBeenCalledWith(source);
  });

  it('resets failed rows via RPC', async () => {
    find.mockResolvedValue({
      livepeer_asset_id: source.assetId,
      livepeer_playback_id: source.playbackId,
      source_sha256: source.sha256,
      source_bytes: source.sizeBytes,
      state: 'failed',
      frameworks_asset_id: 'old',
      frameworks_playback_id: 'old-play',
    });
    await expect(prepareFailedImportRetry(db, source)).resolves.toEqual({ action: 'reset' });
    expect(rpc).toHaveBeenCalledWith('reset_frameworks_failed_import', expect.objectContaining({ p_source: source.assetId }));
  });

  it('is idempotent for prepared rows awaiting upload', async () => {
    find.mockResolvedValue({
      livepeer_asset_id: source.assetId,
      livepeer_playback_id: source.playbackId,
      source_sha256: source.sha256,
      source_bytes: source.sizeBytes,
      state: 'prepared',
      frameworks_asset_id: null,
      frameworks_playback_id: null,
    });
    await expect(prepareFailedImportRetry(db, source)).resolves.toEqual({ action: 'unchanged' });
    expect(rpc).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });
});