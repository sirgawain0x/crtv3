/**
 * Reviewed derivative recovery: adopting a re-encoded replacement for an import
 * that FrameWorks could not process, without retrying the original upload.
 *
 * Scope, deliberately narrow:
 *
 * - A substitution is only possible from a **reviewed plan** checked into this
 *   directory, so the approval (`approvedBy`, `reason`, hashes, sizes) is
 *   reviewable in a diff. `candidate` plans are recorded but never actionable.
 * - The plan binds the **original archive evidence** (source identity, sha256,
 *   bytes) to the **derivative** (its own sha256/bytes) so both identities are
 *   recoverable after adoption.
 * - The original attempt is never reset, deleted or overwritten. It stays
 *   quarantined and protected; adoption only changes which provider identity the
 *   import row points at.
 * - Adoption requires the replacement to be provider-`ready`, protected, and to
 *   return a playable HLS manifest before the mapping changes.
 *
 * This path is separate from `reviewed-recovery.ts`, which remains pinned to its
 * single forensically reviewed pre-transfer attempt. That legacy flow and its
 * RPCs are untouched, so existing recoveries keep working.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArchivedSource } from './archive';
import { createImportLedger } from './supabase-ledger';
import { frameworksAssets } from '../frameworks/assets';
import { secureFrameworksVod } from '../frameworks/vod-policy';
import { inspectMigrationPlayback } from './inspect-playback';
import plansFile from './reviewed-derivative-plans.json';

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

const SHA256 = /^[0-9a-f]{64}$/;
const ORIGINAL_RECOVERABLE_STATES = new Set(['failed', 'ambiguous']);

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
 * The single reviewed plan for this archived source, or a refusal.
 *
 * Every mismatch is a hard error: the caller cannot proceed on a near-match,
 * because adoption rewrites which bytes the app will serve.
 */
export function findReviewedDerivativePlan(
  source: ArchivedSource,
  original: Pick<{ state?: string; frameworks_asset_id?: string | null; frameworks_playback_id?: string | null }, 'state' | 'frameworks_asset_id' | 'frameworks_playback_id'> | null | undefined,
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
  if (!original) {
    throw new ReviewedDerivativeError('Original import evidence is missing');
  }
  if (!ORIGINAL_RECOVERABLE_STATES.has(String(original.state))) {
    throw new ReviewedDerivativeError('Original import is not in a recoverable state');
  }
  if (!original.frameworks_asset_id || !original.frameworks_playback_id) {
    throw new ReviewedDerivativeError('Original attempt identity is not retained');
  }
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

/**
 * Adopt the replacement only after it is ready, protected and playable.
 * The original attempt's identity and evidence are left intact.
 */
export async function adoptReviewedDerivative(
  db: SupabaseClient,
  source: ArchivedSource,
  raw: unknown = plansFile,
): Promise<void> {
  const original = await createImportLedger(db).find(source.assetId);
  const plan = findReviewedDerivativePlan(source, original, raw);

  const recovered = await createImportLedger(db, 'frameworks_import_recoveries').find(source.assetId);
  if (!recovered || recovered.state !== 'ready' || !recovered.frameworks_asset_id || !recovered.frameworks_playback_id) {
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
  // The replacement must not reuse the original attempt's identity.
  if (recovered.frameworks_asset_id === original!.frameworks_asset_id ||
      recovered.frameworks_playback_id === original!.frameworks_playback_id) {
    throw new ReviewedDerivativeError('Replacement reuses the original attempt identity');
  }

  const replacement = await frameworksAssets.get(recovered.frameworks_asset_id);
  if (!replacement || replacement.id !== recovered.frameworks_asset_id ||
      replacement.playbackId !== recovered.frameworks_playback_id ||
      replacement.status?.phase?.toLowerCase() !== 'ready') {
    throw new ReviewedDerivativeError('Replacement is not provider-ready');
  }

  await secureFrameworksVod(recovered.frameworks_asset_id, recovered.frameworks_playback_id);
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
