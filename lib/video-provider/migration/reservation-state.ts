import type { ArchivedSource } from './archive';
import type { ImportRecord, ImportState } from './importer';

export type LedgerReservationState = ImportState | 'missing';

const RETRY_ROUTE_STATES = new Set<LedgerReservationState>([
  'missing', 'failed', 'prepared', 'importing', 'processing', 'ready',
]);

export function evidenceMatchesReservation(record: ImportRecord, source: ArchivedSource): boolean {
  return record.livepeer_asset_id === source.assetId
    && record.livepeer_playback_id === source.playbackId
    && record.source_sha256 === source.sha256
    && record.source_bytes === source.sizeBytes;
}

/** Read-only ledger routing input for retry batches; never polls the provider or reads source bytes. */
export function readLedgerReservationState(
  record: ImportRecord | null,
  source: ArchivedSource,
): LedgerReservationState {
  if (!record) return 'missing';
  if (!evidenceMatchesReservation(record, source)) {
    throw new Error('Source evidence differs from its reserved import');
  }
  if (record.state === 'ambiguous') {
    throw new Error('Import needs reconciliation before retry');
  }
  if (!RETRY_ROUTE_STATES.has(record.state)) {
    throw new Error(`Import state ${record.state} is not eligible for retry routing`);
  }
  return record.state;
}