import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import type { ImportProvider } from './importer';

const m = vi.hoisted(() => ({
  original: vi.fn(),
  recovered: vi.fn(),
  asset: vi.fn(),
  secure: vi.fn(),
  inspect: vi.fn(),
  transition: vi.fn(),
}));

vi.mock('./supabase-ledger', () => ({
  createImportLedger: (_db: unknown, table?: string) => ({
    find: table ? m.recovered : m.original,
    transition: m.transition,
  }),
}));
vi.mock('../frameworks/assets', () => ({ frameworksAssets: { get: m.asset } }));
vi.mock('../frameworks/vod-policy', () => ({ secureFrameworksVod: m.secure }));
vi.mock('./inspect-playback', () => ({ inspectMigrationPlayback: m.inspect }));

import {
  ReviewedDerivativeError,
  adoptReviewedDerivative,
  approvedDerivativePlans,
  confirmReviewedDerivativeReady,
  findReviewedDerivativePlan,
  prepareReviewedDerivativeRecovery,
  uploadReviewedDerivative,
} from './reviewed-derivative';

const SHA = (c: string) => c.repeat(64);

const source = {
  assetId: 'fac7fe31-599d-405e-90d1-b406b08d728a',
  playbackId: 'lp-tulleti-playback',
  sha256: SHA('a'),
  sizeBytes: 237_282_639,
};

const plan = {
  status: 'approved' as const,
  livepeerAssetId: source.assetId,
  originalPlaybackId: source.playbackId,
  originalSha256: SHA('a'),
  originalBytes: source.sizeBytes,
  derivativeSha256: SHA('b'),
  derivativeBytes: 630_109_556,
  derivativeOrigin: 'transcode:h264-8bit',
  approvedBy: '0xReviewer',
  approvedAt: '2026-11-26T00:00:00Z',
  reason: '10-bit AV1 is not ingested by the provider; H.264 derivative decodes clean',
};
const plans = (list: unknown[]) => ({ plans: list });

const originalRow = {
  state: 'failed',
  frameworks_asset_id: 'orig-asset',
  frameworks_playback_id: 'orig-play',
};

const recoveredRow = {
  state: 'ready',
  livepeer_playback_id: source.playbackId,
  source_sha256: source.sha256,
  source_bytes: source.sizeBytes,
  derivative_sha256: plan.derivativeSha256,
  derivative_bytes: plan.derivativeBytes,
  frameworks_asset_id: 'new-asset',
  frameworks_playback_id: 'new-play',
};

const rpc = vi.fn();
const db = { rpc } as never;

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
  m.original.mockResolvedValue(originalRow);
  m.recovered.mockResolvedValue(recoveredRow);
  m.asset.mockResolvedValue({ id: 'new-asset', playbackId: 'new-play', status: { phase: 'ready' } });
  m.secure.mockResolvedValue(undefined);
  m.inspect.mockResolvedValue({ playableManifest: true });
  m.transition.mockResolvedValue(true);
});

describe('reviewed derivative — plan authorization', () => {
  it('refuses a source with no plan at all', () => {
    expect(() => findReviewedDerivativePlan(source, originalRow, plans([]))).toThrow(ReviewedDerivativeError);
    expect(() => findReviewedDerivativePlan(source, originalRow, plans([]))).toThrow(/no approved derivative plan/);
  });

  it('refuses a candidate plan — reviewed but not approved', () => {
    const candidate = { ...plan, status: 'candidate' };
    expect(approvedDerivativePlans(plans([candidate]))).toHaveLength(0);
    expect(() => findReviewedDerivativePlan(source, originalRow, plans([candidate]))).toThrow(/no approved/);
  });

  it('refuses an approved plan that lacks an approver or reason', () => {
    expect(approvedDerivativePlans(plans([{ ...plan, approvedBy: '  ' }]))).toHaveLength(0);
    expect(approvedDerivativePlans(plans([{ ...plan, reason: '' }]))).toHaveLength(0);
  });

  it('refuses a plan recorded for a different asset', () => {
    const other = { ...plan, livepeerAssetId: 'someone-elses-asset' };
    expect(() => findReviewedDerivativePlan(source, originalRow, plans([other]))).toThrow(/no approved/);
  });

  it('does not act on any plan before the database is touched', async () => {
    await expect(prepareReviewedDerivativeRecovery(db, source, plans([]))).rejects.toThrow(/no approved/);
    expect(rpc).not.toHaveBeenCalled();
    expect(m.secure).not.toHaveBeenCalled();
  });
});

describe('reviewed derivative — evidence mismatch', () => {
  it('rejects a changed archived source hash', () => {
    expect(() => findReviewedDerivativePlan({ ...source, sha256: SHA('c') }, originalRow, plans([plan])))
      .toThrow(/archive evidence differs/);
  });

  it('rejects a changed archived size', () => {
    expect(() => findReviewedDerivativePlan({ ...source, sizeBytes: source.sizeBytes + 1 }, originalRow, plans([plan])))
      .toThrow(/archive evidence differs/);
  });

  it('rejects a changed source playback identity', () => {
    expect(() => findReviewedDerivativePlan({ ...source, playbackId: 'other-play' }, originalRow, plans([plan])))
      .toThrow(/source evidence differs/);
  });

  it('rejects a "derivative" whose bytes equal the original', () => {
    const same = { ...plan, derivativeSha256: plan.originalSha256 };
    expect(() => findReviewedDerivativePlan(source, originalRow, plans([same]))).toThrow(/duplicates the original/);
  });

  it('rejects adoption when the recorded derivative evidence differs from the review', async () => {
    m.recovered.mockResolvedValue({ ...recoveredRow, derivative_sha256: SHA('d') });
    await expect(adoptReviewedDerivative(db, source, plans([plan]))).rejects.toThrow(/derivative evidence differs/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects adoption when the recorded original evidence differs', async () => {
    m.recovered.mockResolvedValue({ ...recoveredRow, source_sha256: SHA('e') });
    await expect(adoptReviewedDerivative(db, source, plans([plan]))).rejects.toThrow(/original evidence differs/);
  });
});

describe('reviewed derivative — original attempt states', () => {
  it('accepts a failed import', async () => {
    m.original.mockResolvedValue({ ...originalRow, state: 'failed' });
    await expect(prepareReviewedDerivativeRecovery(db, source, plans([plan]))).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('prepare_reviewed_derivative_recovery', expect.objectContaining({
      p_source: source.assetId, p_derivative_sha256: plan.derivativeSha256,
    }));
  });

  it('accepts an ambiguous import', async () => {
    m.original.mockResolvedValue({ ...originalRow, state: 'ambiguous' });
    await expect(prepareReviewedDerivativeRecovery(db, source, plans([plan]))).resolves.toBeUndefined();
  });

  it.each(['ready', 'processing', 'importing', 'prepared'])('refuses a %s import', (state) => {
    expect(() => findReviewedDerivativePlan(source, { ...originalRow, state }, plans([plan])))
      .toThrow(/not in a recoverable state/);
  });

  it('refuses when the original attempt identity was not retained', () => {
    expect(() => findReviewedDerivativePlan(source, { state: 'failed', frameworks_asset_id: null, frameworks_playback_id: null }, plans([plan])))
      .toThrow(/identity is not retained/);
  });

  it('keeps the original attempt protected and writes nothing to it', async () => {
    await prepareReviewedDerivativeRecovery(db, source, plans([plan]));
    expect(m.secure).toHaveBeenCalledWith('orig-asset', 'orig-play');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe('reviewed derivative — adoption proves the replacement first', () => {
  it('refuses when playback verification fails', async () => {
    m.inspect.mockResolvedValue({ playableManifest: false });
    await expect(adoptReviewedDerivative(db, source, plans([plan]))).rejects.toThrow(/playback has not passed/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a replacement the provider has not marked ready', async () => {
    m.asset.mockResolvedValue({ id: 'new-asset', playbackId: 'new-play', status: { phase: 'processing' } });
    await expect(adoptReviewedDerivative(db, source, plans([plan]))).rejects.toThrow(/not provider-ready/);
    expect(m.inspect).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a recovery row that is not ready', async () => {
    m.recovered.mockResolvedValue({ ...recoveredRow, state: 'processing' });
    await expect(adoptReviewedDerivative(db, source, plans([plan]))).rejects.toThrow(/ready replacement is required/);
  });

  it('refuses a replacement that reuses the original identity', async () => {
    m.recovered.mockResolvedValue({ ...recoveredRow, frameworks_asset_id: 'orig-asset' });
    await expect(adoptReviewedDerivative(db, source, plans([plan]))).rejects.toThrow(/reuses the original/);
  });

  it('protects the replacement, verifies playback, then adopts', async () => {
    await adoptReviewedDerivative(db, source, plans([plan]));
    expect(m.secure).toHaveBeenCalledWith('new-asset', 'new-play');
    expect(m.inspect).toHaveBeenCalledWith('new-play', fetch, 'new-asset');
    expect(rpc).toHaveBeenCalledWith('adopt_reviewed_derivative_recovery', { p_source: source.assetId });
  });

  it('surfaces a failed adoption without claiming success', async () => {
    rpc.mockResolvedValue({ error: { message: 'Original attempt is no longer safely quarantined' } });
    await expect(adoptReviewedDerivative(db, source, plans([plan])))
      .rejects.toThrow(/original evidence is retained/);
  });
});

describe('reviewed derivative — legacy recovery compatibility', () => {
  it('does not widen the existing single-asset recovery flow', async () => {
    const legacy = await import('./reviewed-recovery');
    // The legacy path stays pinned to its one reviewed pre-transfer attempt: this
    // source must still be refused by it.
    expect(() => legacy.requireReviewedRecoverySource(source)).toThrow(/no reviewed replacement plan/);
    // …and it still uses its own RPCs, not the derivative ones.
    m.original.mockResolvedValue({
      state: 'ambiguous',
      frameworks_asset_id: '202611241631464302d8bfdb5ddbae',
      frameworks_playback_id: 'mBdbNNDWgTBDqQfu',
    });
    m.asset.mockResolvedValue({ id: '202611241631464302d8bfdb5ddbae', playbackId: 'mBdbNNDWgTBDqQfu', status: { phase: 'processing' } });
    await legacy.prepareReviewedRecovery(
      db,
      {
        assetId: 'bd18c602-9323-4b6e-aa90-7f8e8065e416',
        playbackId: 'bd18hlmb6vazgsy8',
        sizeBytes: 160_998_594,
        sha256: 'ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e',
      },
      '0xabc',
    );
    expect(rpc).toHaveBeenCalledWith('prepare_reviewed_frameworks_recovery', { p_reviewer: '0xabc' });
    expect(rpc).not.toHaveBeenCalledWith('prepare_reviewed_derivative_recovery', expect.anything());
  });
});

describe('reviewed derivative — verified upload binding', () => {
  // Non-uniform bytes: with a repeating value, reordering halves would not change
  // the digest and the binding test would pass for the wrong reason.
  const data = Uint8Array.from({ length: 1024 }, (_, i) => i % 251);
  const dataSha = createHash('sha256').update(data).digest('hex');
  const uploadPlan = { ...plan, derivativeSha256: dataSha, derivativeBytes: data.byteLength };

  const makeProvider = (options: { parts?: Array<{ partNumber: number; url: string }>; phase?: string } = {}) => {
    const parts = options.parts ?? [{ partNumber: 1, url: 'u1' }, { partNumber: 2, url: 'u2' }];
    return {
      createProtectedUpload: vi.fn(async () => ({
        assetId: 'new-asset', playbackId: 'new-play', uploadId: 'up1', partSize: 512, parts,
      })),
      uploadPart: vi.fn(async () => 'etag-1'),
      complete: vi.fn(async () => ({ assetId: 'new-asset', playbackId: 'new-play' })),
      inspect: vi.fn(async () => ({ assetId: 'new-asset', playbackId: 'new-play', phase: options.phase ?? 'ready' })),
      confirmProtection: vi.fn(async () => undefined),
    } as unknown as ImportProvider;
  };

  it('refuses a local file whose size differs before any provider call', async () => {
    const provider = makeProvider();
    await expect(uploadReviewedDerivative(db, source, data.subarray(0, 512), plans([uploadPlan]), provider))
      .rejects.toThrow(/size does not match/);
    expect(provider.createProtectedUpload).not.toHaveBeenCalled();
  });

  it('refuses a local file whose hash differs before any provider call', async () => {
    const provider = makeProvider();
    const tampered = Uint8Array.from({ length: 1024 }, (_, i) => (i * 7) % 251);
    await expect(uploadReviewedDerivative(db, source, tampered, plans([uploadPlan]), provider))
      .rejects.toThrow(/hash does not match/);
    expect(provider.createProtectedUpload).not.toHaveBeenCalled();
  });

  it('refuses a provider session that reuses the original attempt identity', async () => {
    const provider = makeProvider();
    (provider.createProtectedUpload as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      assetId: 'orig-asset', playbackId: 'new-play', uploadId: 'up1', partSize: 512,
      parts: [{ partNumber: 1, url: 'u1' }, { partNumber: 2, url: 'u2' }],
    });
    await expect(uploadReviewedDerivative(db, source, data, plans([uploadPlan]), provider))
      .rejects.toThrow(/reuses the original/);
  });

  it('refuses to complete when the transferred bytes hash differently', async () => {
    // Provider returns parts out of order, so the bytes are hashed in a different
    // order than they appear in the reviewed file.
    const provider = makeProvider({ parts: [{ partNumber: 2, url: 'u2' }, { partNumber: 1, url: 'u1' }] });
    await expect(uploadReviewedDerivative(db, source, data, plans([uploadPlan]), provider))
      .rejects.toThrow(/Transferred bytes do not match/);
    expect(provider.complete).not.toHaveBeenCalled();
    expect(m.transition).not.toHaveBeenCalled();
  });

  it('uploads, verifies, binds the provider identity and protects it', async () => {
    const provider = makeProvider();
    const result = await uploadReviewedDerivative(db, source, data, plans([uploadPlan]), provider);

    expect(result).toEqual({ assetId: 'new-asset', playbackId: 'new-play' });
    expect(provider.uploadPart).toHaveBeenCalledTimes(2);
    expect(provider.complete).toHaveBeenCalledWith('up1', [
      { partNumber: 1, etag: 'etag-1' }, { partNumber: 2, etag: 'etag-1' },
    ]);
    expect(m.transition).toHaveBeenCalledWith(source.assetId, 'prepared', 'processing',
      { assetId: 'new-asset', playbackId: 'new-play' });
    expect(provider.confirmProtection).toHaveBeenCalledWith('new-asset', 'new-play');
  });

  it('does not claim a binding when the ledger refuses the transition', async () => {
    const provider = makeProvider();
    m.transition.mockResolvedValue(false);
    await expect(uploadReviewedDerivative(db, source, data, plans([uploadPlan]), provider))
      .rejects.toThrow(/Could not bind the verified upload/);
  });
});

describe('reviewed derivative — ready confirmation', () => {
  const providerFor = (phase: string) => ({
    createProtectedUpload: vi.fn(),
    uploadPart: vi.fn(),
    complete: vi.fn(),
    inspect: vi.fn(async () => ({ assetId: 'new-asset', playbackId: 'new-play', phase })),
    confirmProtection: vi.fn(),
  } as unknown as ImportProvider);

  beforeEach(() => {
    m.recovered.mockResolvedValue({ ...recoveredRow, state: 'processing', adopted_at: null });
  });

  it('marks the recovery ready once the provider reports ready', async () => {
    await confirmReviewedDerivativeReady(db, source, plans([plan]), { provider: providerFor('ready'), delayMs: 0 });
    expect(m.transition).toHaveBeenCalledWith(source.assetId, 'processing', 'ready');
  });

  it('surfaces a provider-side failure immediately', async () => {
    await expect(confirmReviewedDerivativeReady(db, source, plans([plan]), { provider: providerFor('failed'), delayMs: 0 }))
      .rejects.toThrow(/failed provider processing/);
    expect(m.transition).not.toHaveBeenCalled();
  });

  it('gives up rather than waiting forever', async () => {
    await expect(confirmReviewedDerivativeReady(db, source, plans([plan]), {
      provider: providerFor('processing'), attempts: 2, delayMs: 0,
    })).rejects.toThrow(/did not become ready/);
  });
});

describe('reviewed derivative — already adopted', () => {
  it('reports success when the adoption already landed', async () => {
    m.original.mockResolvedValue({ state: 'ready', frameworks_asset_id: 'new-asset', frameworks_playback_id: 'new-play' });
    m.recovered.mockResolvedValue({ ...recoveredRow, adopted_at: '2026-11-26T01:00:00Z' });

    await expect(adoptReviewedDerivative(db, source, plans([plan]))).resolves.toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
    expect(m.inspect).not.toHaveBeenCalled();
  });

  it('does not treat a mismatched adopted record as success', async () => {
    m.original.mockResolvedValue({ state: 'ready', frameworks_asset_id: 'some-other-asset', frameworks_playback_id: 'new-play' });
    m.recovered.mockResolvedValue({ ...recoveredRow, adopted_at: '2026-11-26T01:00:00Z' });

    await expect(adoptReviewedDerivative(db, source, plans([plan])))
      .rejects.toThrow(/not in a recoverable state/);
  });
});
