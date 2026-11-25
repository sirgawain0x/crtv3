import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArchivedSource } from './archive';
import { createImportLedger } from './supabase-ledger';
import type { ImportRecord } from './importer';

export class FailedImportRetryError extends Error {}

function evidenceMatches(record: ImportRecord, source: ArchivedSource): boolean {
  return record.livepeer_asset_id === source.assetId
    && record.livepeer_playback_id === source.playbackId
    && record.source_sha256 === source.sha256
    && record.source_bytes === source.sizeBytes;
}

const BLOCKED_RETRY_STATES = new Set(['importing', 'processing', 'ambiguous', 'ready']);

/** Reserve missing rows or reset a failed reservation back to prepared. Never mutates ready imports. */
export async function prepareFailedImportRetry(
  db: SupabaseClient,
  source: ArchivedSource,
): Promise<{ action: 'reserved' | 'reset' | 'unchanged' }> {
  const ledger = createImportLedger(db);
  const existing = await ledger.find(source.assetId);
  if (existing) {
    if (existing.state === 'ready') throw new FailedImportRetryError('Ready imports cannot be retried');
    if (!evidenceMatches(existing, source)) throw new FailedImportRetryError('Source evidence differs from its reserved import');
    if (BLOCKED_RETRY_STATES.has(existing.state)) {
      throw new FailedImportRetryError(
        `Import is ${existing.state}; reconcile or poll before a checksum-verified retry`,
      );
    }
    if (existing.state === 'prepared' && !existing.frameworks_asset_id && !existing.frameworks_playback_id) {
      return { action: 'unchanged' };
    }
    if (existing.state === 'failed') {
      const { error } = await db.rpc('reset_frameworks_failed_import', {
        p_source: source.assetId,
        p_playback: source.playbackId,
        p_sha256: source.sha256,
        p_bytes: source.sizeBytes,
      });
      if (error) throw new FailedImportRetryError('Could not reset the failed import for retry');
      return { action: 'reset' };
    }
    throw new FailedImportRetryError(`Import state ${existing.state} is not eligible for retry`);
  }
  await ledger.reserve(source);
  return { action: 'reserved' };
}