/**
 * Reviewed derivative recovery: adopting a re-encoded replacement for an import
 * that FrameWorks could not process, without retrying the original upload.
 *
 * Scope, deliberately narrow:
 *
 * - A substitution is only possible from a **reviewed plan** checked into this
 *   directory, so approval (`approvedBy`, `reason`, hashes, sizes) is reviewable
 *   in a diff. `candidate` plans are recorded but never actionable.
 * - Every step re-verifies the bytes. The plan's hash is not copied into the
 *   database and compared back to itself: `uploadReviewedDerivative` hashes the
 *   local file *before* the transfer and hashes the bytes *as they are sent*, and
 *   refuses to complete the upload unless the digest matches the reviewed
 *   derivative. The provider identities it returns are the ones bound to that
 *   verified attempt.
 * - The original attempt is never reset, deleted or overwritten. It stays
 *   quarantined and protected; adoption only changes which provider identity the
 *   import row points at.
 * - Adoption requires the replacement to be provider-`ready`, protected, and to
 *   return a playable HLS manifest before the mapping changes.
 *
 * This path is separate from `reviewed-recovery.ts`, which remains pinned to its
 * single forensically reviewed pre-transfer attempt. That legacy flow and its
 * RPCs are untouched, and legacy recovery rows keep working: derivative evidence
 * is only required for rows marked `recovery_kind = 'derivative'`.
 */

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArchivedSource } from './archive';
import { createImportLedger } from './supabase-ledger';
import type { ImportProvider } from './importer';
import plansFile from './reviewed-derivative-plans.json';

// Provider and playback modules are imported lazily inside the steps that need
// them: reading a plan (and a CLI dry run) must not pull the server-only
// provider graph.

/** Fixed local checks only; provider and database messages are never surfaced raw. */
export class ReviewedDerivativeError extends Error {}

export type ReviewedDerivativePlan = {
  status: 'approved' | 'candidate';
  livepeerAssetId: string;
  originalPlaybackId: string;
  originalSha256: string;
  originalBytes: number;
  derivativeSha256: string;
  derivativeBytes: number;
  derivativeOrigin: string;
  approvedBy: string;
  approvedAt: string;
  reason: string;
};

type OriginalRecord = {
  state?: string | null;
  frameworks_asset_id?: string | null;
  frameworks_playback_id?: string | null;
} | null | undefined;

const SHA256 = /^[0-9a-f]{64}$/;
const RECOVERABLE_STATES = new Set(['failed', 'ambiguous']);

function isPlan(value: unknown): value is ReviewedDerivativePlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    (p.status === 'approved' || p.status === 'candidate') &&
    typeof p.livepeerAssetId === 'string' && p.livepeerAssetId.length > 0 &&
    typeof p.originalPlaybackId === 'string' && p.originalPlaybackId.length > 0 &&
    typeof p.originalSha256 === 'string' && SHA256.test(p.originalSha256) &&
    typeof p.originalBytes === 'number' && Number.isSafeInteger(p.originalBytes) && p.originalBytes > 0 &&
    typeof p.derivativeSha256 === 'string' && SHA256.test(p.derivativeSha256) &&
    typeof p.derivativeBytes === 'number' && Number.isSafeInteger(p.derivativeBytes) && p.derivativeBytes > 0 &&
    typeof p.derivativeOrigin === 'string' && p.derivativeOrigin.length > 0 &&
    typeof p.approvedBy === 'string' && p.approvedBy.trim().length > 0 &&
    typeof p.approvedAt === 'string' && p.approvedAt.trim().length > 0 &&
    typeof p.reason === 'string' && p.reason.trim().length > 0
  );
}

/**
 * Plans from the checked-in file. Only `approved` plans are returned; a
 * `candidate` is a recorded review item, not permission to substitute.
 */
export function approvedDerivativePlans(raw: unknown = plansFile): ReviewedDerivativePlan[] {
  const container = raw as { plans?: unknown } | undefined;
  const list = Array.isArray(container?.plans) ? container!.plans : [];
  return list.filter(isPlan).filter((plan) => plan.status === 'approved');
}

/**
 * Identity and evidence checks only — deliberately no state gate.
 *
 * Split out so adoption can recognise an already-adopted recovery (whose
 * original row is now `ready`) before the recoverable-state gate is applied.
 */
export function resolveReviewedDerivativePlan(
  source: ArchivedSource,
  raw: unknown = plansFile,
): ReviewedDerivativePlan {
  const plan = approvedDerivativePlans(raw).find((p) => p.livepeerAssetId === source.assetId);
  if (!plan) {
    throw new ReviewedDerivativeError('This source has no approved derivative plan');
  }
  if (plan.originalPlaybackId !== source.playbackId) {
    throw new ReviewedDerivativeError('Reviewed derivative source evidence differs');
  }
  if (plan.originalSha256 !== source.sha256 || plan.originalBytes !== source.sizeBytes) {
    throw new ReviewedDerivativeError('Reviewed derivative archive evidence differs');
  }
  // The replacement must be different bytes; adopting identical evidence would
  // be a retry of the original upload wearing a derivative's name.
  if (plan.derivativeSha256 === plan.originalSha256) {
    throw new ReviewedDerivativeError('Derivative evidence duplicates the original bytes');
  }
  return plan;
}

/** Only a quarantined attempt may be substituted. */
export function assertRecoverableOriginal(original: OriginalRecord): void {
  if (!original) {
    throw new ReviewedDerivativeError('Original import evidence is missing');
  }
  if (!RECOVERABLE_STATES.has(String(original.state))) {
    throw new ReviewedDerivativeError('Original import is not in a recoverable state');
  }
  if (!original.frameworks_asset_id || !original.frameworks_playback_id) {
    throw new ReviewedDerivativeError('Original attempt identity is not retained');
  }
}

/** Plan lookup for a substitution that is still pending (prepare / upload). */
export function findReviewedDerivativePlan(
  source: ArchivedSource,
  original: OriginalRecord,
  raw: unknown = plansFile,
): ReviewedDerivativePlan {
  const plan = resolveReviewedDerivativePlan(source, raw);
  assertRecoverableOriginal(original);
  return plan;
}

/**
 * Record the reviewed substitution and keep the original attempt protected.
 * Performs no upload, reset or deletion.
 */
export async function prepareReviewedDerivativeRecovery(
  db: SupabaseClient,
  source: ArchivedSource,
  raw: unknown = plansFile,
): Promise<void> {
  const original = await createImportLedger(db).find(source.assetId);
  const plan = findReviewedDerivativePlan(source, original, raw);

  // Preservation: re-assert protection on the quarantined original before any
  // new attempt exists, so the failed bytes stay retrievable for the record.
  const { secureFrameworksVod } = await import('../frameworks/vod-policy');
  await secureFrameworksVod(original!.frameworks_asset_id!, original!.frameworks_playback_id!);

  const { error } = await db.rpc('prepare_reviewed_derivative_recovery', {
    p_source: source.assetId,
    p_reviewer: plan.approvedBy.toLowerCase(),
    p_original_sha256: plan.originalSha256,
    p_original_bytes: plan.originalBytes,
    p_derivative_sha256: plan.derivativeSha256,
    p_derivative_bytes: plan.derivativeBytes,
    p_derivative_origin: plan.derivativeOrigin,
    p_reason: plan.reason,
  });
  if (error) {
    throw new ReviewedDerivativeError('Could not preserve the reviewed derivative evidence');
  }
}

export type DerivativeUploadResult = { assetId: string; playbackId: string };

/**
 * Upload the derivative through the protected multipart path, hashing the bytes
 * on the way out.
 *
 * The digest comparison before completion is the binding step: the provider
 * artifact cannot exist unless the transferred bytes matched the reviewed
 * derivative, so a later adoption is not merely comparing a stored value to the
 * plan it came from.
 */
export async function uploadReviewedDerivative(
  db: SupabaseClient,
  source: ArchivedSource,
  derivativeBytes: Uint8Array,
  raw: unknown = plansFile,
  providerOverride?: ImportProvider,
): Promise<DerivativeUploadResult> {
  const provider = providerOverride ?? (await import('./frameworks-import-provider')).createFrameworksImportProvider();
  const original = await createImportLedger(db).find(source.assetId);
  const plan = findReviewedDerivativePlan(source, original, raw);

  // 1. The local file must be the reviewed derivative before anything is sent.
  if (derivativeBytes.byteLength !== plan.derivativeBytes) {
    throw new ReviewedDerivativeError('Derivative file size does not match the reviewed plan');
  }
  if (createHash('sha256').update(derivativeBytes).digest('hex') !== plan.derivativeSha256) {
    throw new ReviewedDerivativeError('Derivative file hash does not match the reviewed plan');
  }

  // 2. Protected upload session for the derivative's own byte count.
  const upload = await provider.createProtectedUpload({
    assetId: source.assetId,
    playbackId: source.playbackId,
    sha256: plan.derivativeSha256,
    sizeBytes: plan.derivativeBytes,
  });
  if (!upload.assetId || !upload.playbackId || !upload.uploadId || !upload.partSize ||
      upload.partSize <= 0 ||
      upload.parts.length !== Math.ceil(plan.derivativeBytes / upload.partSize)) {
    throw new ReviewedDerivativeError('Provider returned an invalid upload session');
  }
  if (upload.assetId === original!.frameworks_asset_id ||
      upload.playbackId === original!.frameworks_playback_id) {
    throw new ReviewedDerivativeError('Replacement reuses the original attempt identity');
  }

  // 3. Transfer, hashing exactly the bytes that are sent.
  const transferred = createHash('sha256');
  const completed: Array<{ partNumber: number; etag: string }> = [];
  for (const part of upload.parts) {
    const start = (part.partNumber - 1) * upload.partSize;
    const chunk = derivativeBytes.subarray(start, start + upload.partSize);
    transferred.update(chunk);
    const etag = await provider.uploadPart(part.url, chunk);
    if (!etag.trim()) {
      throw new ReviewedDerivativeError('Upload part returned no ETag');
    }
    completed.push({ partNumber: part.partNumber, etag });
  }
  if (transferred.digest('hex') !== plan.derivativeSha256) {
    throw new ReviewedDerivativeError('Transferred bytes do not match the reviewed derivative');
  }

  // 4. Only now may the upload be completed.
  const target = await provider.complete(upload.uploadId, completed);
  if (target.assetId !== upload.assetId || target.playbackId !== upload.playbackId) {
    throw new ReviewedDerivativeError('Completion returned a different provider identity');
  }

  const recorded = await createImportLedger(db, 'frameworks_import_recoveries')
    .transition(source.assetId, 'prepared', 'processing', target);
  if (!recorded) {
    throw new ReviewedDerivativeError('Could not bind the verified upload to the reviewed recovery');
  }

  await provider.confirmProtection(target.assetId, target.playbackId);
  return target;
}

/**
 * Poll the provider until the replacement is `ready`, then mark the recovery row
 * ready. A provider-side failure is reported immediately rather than waited out.
 */
export async function confirmReviewedDerivativeReady(
  db: SupabaseClient,
  source: ArchivedSource,
  raw: unknown = plansFile,
  options: { attempts?: number; delayMs?: number; provider?: ImportProvider } = {},
): Promise<void> {
  const { attempts = 12, delayMs = 5000, provider: providerOverride } = options;
  const provider = providerOverride ?? (await import('./frameworks-import-provider')).createFrameworksImportProvider();
  const plan = resolveReviewedDerivativePlan(source, raw);
  const ledger = createImportLedger(db, 'frameworks_import_recoveries');
  const recovered = await ledger.find(source.assetId);
  if (!recovered || !recovered.frameworks_asset_id) {
    throw new ReviewedDerivativeError('No replacement upload is recorded');
  }
  if (recovered.derivative_sha256 !== plan.derivativeSha256 ||
      recovered.derivative_bytes !== plan.derivativeBytes) {
    throw new ReviewedDerivativeError('Recovery derivative evidence differs');
  }
  if (recovered.state === 'ready') return;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const asset = await provider.inspect(recovered.frameworks_asset_id);
    const phase = asset?.phase?.toLowerCase();
    if (phase === 'failed') {
      throw new ReviewedDerivativeError('The replacement failed provider processing');
    }
    if (phase === 'ready') {
      const marked = await ledger.transition(source.assetId, 'processing', 'ready');
      if (!marked) {
        throw new ReviewedDerivativeError('Could not mark the replacement ready');
      }
      return;
    }
    if (delayMs > 0 && attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new ReviewedDerivativeError('The replacement did not become ready in time');
}

/**
 * Adopt the replacement only after it is ready, protected and playable.
 * The original attempt's identity and evidence are left intact.
 *
 * An already-adopted recovery reports success: the original ledger row is
 * `ready` by then, so the recoverable-state gate must not run before the
 * adoption check or a retry after a lost response would report a false failure.
 */
export async function adoptReviewedDerivative(
  db: SupabaseClient,
  source: ArchivedSource,
  raw: unknown = plansFile,
): Promise<void> {
  const plan = resolveReviewedDerivativePlan(source, raw);
  const original = await createImportLedger(db).find(source.assetId);

  const recovered = await createImportLedger(db, 'frameworks_import_recoveries').find(source.assetId);
  if (!recovered) {
    throw new ReviewedDerivativeError('A ready replacement is required before adoption');
  }
  // Both identities must match the review: the archived original and the
  // derivative that was actually uploaded.
  if (recovered.livepeer_playback_id !== source.playbackId ||
      recovered.source_sha256 !== source.sha256 ||
      recovered.source_bytes !== source.sizeBytes) {
    throw new ReviewedDerivativeError('Recovery original evidence differs');
  }
  if (recovered.derivative_sha256 !== plan.derivativeSha256 ||
      recovered.derivative_bytes !== plan.derivativeBytes) {
    throw new ReviewedDerivativeError('Recovery derivative evidence differs');
  }

  // Already adopted, same replacement on both rows: success, not a conflict.
  if (recovered.adopted_at &&
      original?.state === 'ready' &&
      original.frameworks_asset_id === recovered.frameworks_asset_id &&
      original.frameworks_playback_id === recovered.frameworks_playback_id) {
    return;
  }

  assertRecoverableOriginal(original);

  if (recovered.state !== 'ready' ||
      !recovered.frameworks_asset_id || !recovered.frameworks_playback_id) {
    throw new ReviewedDerivativeError('A ready replacement is required before adoption');
  }
  // The replacement must not reuse the original attempt's identity.
  if (recovered.frameworks_asset_id === original!.frameworks_asset_id ||
      recovered.frameworks_playback_id === original!.frameworks_playback_id) {
    throw new ReviewedDerivativeError('Replacement reuses the original attempt identity');
  }

  const { frameworksAssets } = await import('../frameworks/assets');
  const replacement = await frameworksAssets.get(recovered.frameworks_asset_id);
  if (!replacement || replacement.id !== recovered.frameworks_asset_id ||
      replacement.playbackId !== recovered.frameworks_playback_id ||
      replacement.status?.phase?.toLowerCase() !== 'ready') {
    throw new ReviewedDerivativeError('Replacement is not provider-ready');
  }

  const { secureFrameworksVod } = await import('../frameworks/vod-policy');
  await secureFrameworksVod(recovered.frameworks_asset_id, recovered.frameworks_playback_id);
  const { inspectMigrationPlayback } = await import('./inspect-playback');
  const inspected = await inspectMigrationPlayback(
    recovered.frameworks_playback_id,
    fetch,
    recovered.frameworks_asset_id,
  );
  if (!inspected.playableManifest) {
    throw new ReviewedDerivativeError('Replacement playback has not passed');
  }

  const { error } = await db.rpc('adopt_reviewed_derivative_recovery', { p_source: source.assetId });
  if (error) {
    throw new ReviewedDerivativeError('Could not adopt the verified replacement; original evidence is retained');
  }
}
