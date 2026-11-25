import { CREATIVE_TV_ASSET_UUID_REGEX } from '@/lib/utils/creative-tv-url';
import { isVideoAssetId } from '../asset-id';
import type { ImportRecord, ImportState } from './importer';
import type { ReadyAssetMapping } from './remap-plan';

export const QA_FRAMEWORKS_SUPABASE_URL =
  'https://zxpobpucayevlrzdxhmr.supabase.co' as const;
export const PROD_FRAMEWORKS_SUPABASE_URL =
  'https://zdeiezfoemibjgrkyzvs.supabase.co' as const;

export type ImportLedgerRow = ImportRecord & {
  created_at?: string;
  updated_at?: string;
};

export type ImportCopyAction = 'insert' | 'skip-identical' | 'conflict';

export type ImportCopyItem = {
  row: ReadyAssetMapping;
  action: ImportCopyAction;
  reason?: string;
};

export type ImportMappingCopyPlan = {
  sourceTotal: number;
  sourceReadyCount: number;
  sourceSkippedNonReady: number;
  targetExistingCount: number;
  items: ImportCopyItem[];
  plannedInserts: number;
  skippedIdentical: number;
  conflicts: number;
  executable: boolean;
};

const comparableFields = [
  'livepeer_playback_id',
  'source_sha256',
  'source_bytes',
  'state',
  'frameworks_asset_id',
  'frameworks_playback_id',
] as const;

function sqlLiteral(value: string | number | null): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Invalid numeric identity');
    return String(value);
  }
  if (value.includes('\0')) throw new Error('Invalid SQL value');
  return `'${value.replaceAll("'", "''")}'`;
}

/** Validates a QA ledger row before it may be copied into prod. */
export function readyMappingFromRow(row: ImportLedgerRow): ReadyAssetMapping | null {
  if (row.state !== 'ready') return null;
  if (
    !CREATIVE_TV_ASSET_UUID_REGEX.test(row.livepeer_asset_id) ||
    !/^[a-f0-9]{64}$/.test(row.source_sha256) ||
    !Number.isSafeInteger(row.source_bytes) ||
    row.source_bytes <= 0 ||
    !row.frameworks_asset_id ||
    !row.frameworks_playback_id ||
    !isVideoAssetId(row.frameworks_asset_id) ||
    !isVideoAssetId(row.frameworks_playback_id)
  ) {
    return null;
  }
  return {
    livepeer_asset_id: row.livepeer_asset_id,
    livepeer_playback_id: row.livepeer_playback_id,
    frameworks_asset_id: row.frameworks_asset_id,
    frameworks_playback_id: row.frameworks_playback_id,
    source_sha256: row.source_sha256,
    source_bytes: row.source_bytes,
    state: 'ready',
  };
}

function conflictReason(
  source: ReadyAssetMapping,
  target: ImportLedgerRow,
): string {
  if (target.state !== 'ready') {
    return `Target row exists in state ${target.state}`;
  }
  const diffs: string[] = [];
  for (const key of comparableFields) {
    const left = source[key as keyof ReadyAssetMapping];
    const right = target[key as keyof ImportLedgerRow];
    if (key === 'source_bytes') {
      if (left !== right) diffs.push(key);
      continue;
    }
    if ((left ?? null) !== (right ?? null)) diffs.push(key);
  }
  return diffs.length
    ? `Target row differs on ${diffs.join(', ')}`
    : 'Target row differs';
}

/** Pure diff: no database I/O. Only ready QA rows are eligible for copy. */
export function buildImportMappingCopyPlan(input: {
  source: ImportLedgerRow[];
  target: ImportLedgerRow[];
}): ImportMappingCopyPlan {
  const targetById = new Map(
    input.target.map((row) => [row.livepeer_asset_id, row]),
  );
  const seenFrameworksAsset = new Set<string>();
  const seenFrameworksPlayback = new Set<string>();
  const items: ImportCopyItem[] = [];
  let sourceReadyCount = 0;
  let sourceSkippedNonReady = 0;

  for (const raw of input.source) {
    if (raw.state !== 'ready') {
      sourceSkippedNonReady++;
      continue;
    }
    const ready = readyMappingFromRow(raw);
    if (!ready) {
      sourceSkippedNonReady++;
      items.push({
        row: {
          livepeer_asset_id: raw.livepeer_asset_id,
          livepeer_playback_id: raw.livepeer_playback_id,
          frameworks_asset_id: raw.frameworks_asset_id ?? '',
          frameworks_playback_id: raw.frameworks_playback_id ?? '',
          source_sha256: raw.source_sha256,
          source_bytes: raw.source_bytes,
          state: 'ready',
        },
        action: 'conflict',
        reason: 'Ready row failed import evidence validation',
      });
      continue;
    }
    sourceReadyCount++;
    if (
      seenFrameworksAsset.has(ready.frameworks_asset_id) ||
      seenFrameworksPlayback.has(ready.frameworks_playback_id)
    ) {
      items.push({
        row: ready,
        action: 'conflict',
        reason: 'Duplicate FrameWorks identity in source ready set',
      });
      continue;
    }
    seenFrameworksAsset.add(ready.frameworks_asset_id);
    seenFrameworksPlayback.add(ready.frameworks_playback_id);

    const existing = targetById.get(ready.livepeer_asset_id);
    if (!existing) {
      items.push({ row: ready, action: 'insert' });
      continue;
    }
    if (
      existing.state === 'ready' &&
      existing.frameworks_asset_id === ready.frameworks_asset_id &&
      existing.frameworks_playback_id === ready.frameworks_playback_id &&
      existing.source_sha256 === ready.source_sha256 &&
      existing.source_bytes === ready.source_bytes &&
      (existing.livepeer_playback_id ?? null) ===
        (ready.livepeer_playback_id ?? null)
    ) {
      items.push({ row: ready, action: 'skip-identical' });
      continue;
    }
    items.push({
      row: ready,
      action: 'conflict',
      reason: conflictReason(ready, existing),
    });
  }

  const plannedInserts = items.filter((i) => i.action === 'insert').length;
  const skippedIdentical = items.filter(
    (i) => i.action === 'skip-identical',
  ).length;
  const conflicts = items.filter((i) => i.action === 'conflict').length;

  return {
    sourceTotal: input.source.length,
    sourceReadyCount,
    sourceSkippedNonReady,
    targetExistingCount: input.target.length,
    items,
    plannedInserts,
    skippedIdentical,
    conflicts,
    executable: conflicts === 0 && plannedInserts > 0,
  };
}

function insertStatement(row: ReadyAssetMapping): string {
  const cols =
    'livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,state,frameworks_asset_id,frameworks_playback_id';
  const values = [
    `${sqlLiteral(row.livepeer_asset_id)}::uuid`,
    sqlLiteral(row.livepeer_playback_id),
    sqlLiteral(row.source_sha256),
    row.source_bytes,
    sqlLiteral('ready'),
    sqlLiteral(row.frameworks_asset_id),
    sqlLiteral(row.frameworks_playback_id),
  ].join(', ');
  const guard = `livepeer_asset_id=${sqlLiteral(row.livepeer_asset_id)}::uuid AND state='ready' AND frameworks_asset_id=${sqlLiteral(row.frameworks_asset_id)} AND frameworks_playback_id=${sqlLiteral(row.frameworks_playback_id)} AND source_sha256=${sqlLiteral(row.source_sha256)} AND source_bytes=${row.source_bytes} AND livepeer_playback_id IS NOT DISTINCT FROM ${sqlLiteral(row.livepeer_playback_id)}`;
  return `WITH inserted AS (
 INSERT INTO public.frameworks_asset_imports (${cols})
 SELECT ${values}
 WHERE NOT EXISTS (SELECT 1 FROM public.frameworks_asset_imports WHERE livepeer_asset_id=${sqlLiteral(row.livepeer_asset_id)}::uuid)
 RETURNING livepeer_asset_id)
SELECT 1 / CASE WHEN (SELECT count(*) FROM inserted)=1 OR EXISTS (SELECT 1 FROM public.frameworks_asset_imports WHERE ${guard}) THEN 1 ELSE 0 END AS import_copy_guard;`;
}

function deleteStatement(row: ReadyAssetMapping): string {
  const guard = `livepeer_asset_id=${sqlLiteral(row.livepeer_asset_id)}::uuid AND state='ready' AND frameworks_asset_id=${sqlLiteral(row.frameworks_asset_id)} AND frameworks_playback_id=${sqlLiteral(row.frameworks_playback_id)} AND source_sha256=${sqlLiteral(row.source_sha256)} AND source_bytes=${row.source_bytes} AND livepeer_playback_id IS NOT DISTINCT FROM ${sqlLiteral(row.livepeer_playback_id)}`;
  return `WITH removed AS (DELETE FROM public.frameworks_asset_imports WHERE ${guard} RETURNING livepeer_asset_id)
SELECT 1 / CASE WHEN (SELECT count(*) FROM removed) IN (0,1) THEN 1 ELSE 0 END AS import_rollback_guard;`;
}

/** Transactional apply/rollback SQL for reviewed ready import mappings only. */
export function renderImportMappingCopySql(
  plan: ImportMappingCopyPlan,
  direction: 'apply' | 'rollback',
): string {
  if (plan.conflicts) {
    throw new Error(
      'Resolve import mapping conflicts before generating executable SQL',
    );
  }
  const inserts = plan.items.filter((item) => item.action === 'insert');
  if (!inserts.length) {
    throw new Error('No import mapping inserts are planned');
  }
  const statements = ['BEGIN;', 'SET LOCAL standard_conforming_strings = on;'];
  const ordered =
    direction === 'apply' ? inserts : [...inserts].reverse();
  for (const item of ordered) {
    statements.push(
      direction === 'apply'
        ? insertStatement(item.row)
        : deleteStatement(item.row),
    );
  }
  statements.push('COMMIT;');
  return `${statements.join('\n\n')}\n`;
}

export function assertQaMigrationSupabaseUrl(url: string | undefined): void {
  if (url !== QA_FRAMEWORKS_SUPABASE_URL) {
    throw new Error(
      'Source must be the isolated QA migration database (creative-tv-frameworks-qa)',
    );
  }
}

export function assertProdImportSupabaseUrl(url: string | undefined): void {
  if (url !== PROD_FRAMEWORKS_SUPABASE_URL) {
    throw new Error(
      'Target must be the production creative-tv database; unexpected Supabase URL refused',
    );
  }
}

export function parseImportLedgerRows(raw: unknown): ImportLedgerRow[] {
  if (!Array.isArray(raw)) throw new Error('Invalid import ledger export');
  const allowed: ImportState[] = [
    'prepared',
    'importing',
    'processing',
    'ready',
    'ambiguous',
    'failed',
  ];
  return raw.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('Invalid ledger row');
    const record = row as Record<string, unknown>;
    const state = record.state;
    if (typeof record.livepeer_asset_id !== 'string' || typeof state !== 'string')
      throw new Error('Invalid ledger row identity');
    if (!allowed.includes(state as ImportState))
      throw new Error('Invalid ledger row state');
    if (
      typeof record.source_sha256 !== 'string' ||
      typeof record.source_bytes !== 'number'
    ) {
      throw new Error('Invalid ledger source evidence');
    }
    return {
      livepeer_asset_id: record.livepeer_asset_id,
      livepeer_playback_id:
        typeof record.livepeer_playback_id === 'string'
          ? record.livepeer_playback_id
          : record.livepeer_playback_id === null
            ? null
            : null,
      source_sha256: record.source_sha256,
      source_bytes: record.source_bytes,
      state: state as ImportState,
      frameworks_asset_id:
        typeof record.frameworks_asset_id === 'string'
          ? record.frameworks_asset_id
          : null,
      frameworks_playback_id:
        typeof record.frameworks_playback_id === 'string'
          ? record.frameworks_playback_id
          : null,
      created_at:
        typeof record.created_at === 'string' ? record.created_at : undefined,
      updated_at:
        typeof record.updated_at === 'string' ? record.updated_at : undefined,
    };
  });
}