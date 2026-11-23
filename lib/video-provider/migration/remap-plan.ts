import { isVideoAssetId } from '../asset-id';
import type { ArchivedSource } from './archive';
export type ReadyAssetMapping = {
  livepeer_asset_id: string; livepeer_playback_id: string | null;
  frameworks_asset_id: string; frameworks_playback_id: string;
  source_sha256: string; source_bytes: number; state: 'ready';
};
export type VideoIdentityRow = {
  id: number; asset_id: string; playback_id: string; status: string; updated_at?: string;
  provider?: string | null; livepeer_asset_id?: string | null; livepeer_playback_id?: string | null;
  frameworks_asset_id?: string | null; frameworks_playback_id?: string | null; parent_playback_id?: string | null;
};
export type ReferenceTable = 'hack_beta_submissions' | 'shoppable_videos' | 'metoken_transactions';
export type ReferenceRow = { table: ReferenceTable; id: string | number; values: Record<string, string | null>; updated_at?: string };
type Values = Record<string, string | null>;
export type IdentityPatch = { table: 'video_assets' | ReferenceTable; id: string | number; before: Values; after: Values; expectedUpdatedAt?: string; mapping?: ReadyAssetMapping };
export type UnresolvedReference = { table: string; id: string | number; field: string; value: string };
export type RemapPlan = { patches: IdentityPatch[]; blockers: string[]; preservedDraftIds: number[]; unresolvedReferences: UnresolvedReference[] };
const identityColumns = ['asset_id','playback_id','provider','livepeer_asset_id','livepeer_playback_id','frameworks_asset_id','frameworks_playback_id'] as const;
const referenceFields = {
  hack_beta_submissions: { video_asset_id: 'asset', playback_id: 'playback' },
  shoppable_videos: { livepeer_asset_id: 'asset', livepeer_playback_id: 'playback' },
  metoken_transactions: { playback_id: 'playback' },
} as const;

/** Pure dry-run: no provider calls, database writes, row deletions or invented mappings. */
export function buildAssetRemapPlan(input: { videos: VideoIdentityRow[]; references: ReferenceRow[]; mappings: ReadyAssetMapping[]; archive: ArchivedSource[] }): RemapPlan {
  const plan: RemapPlan = { patches: [], blockers: [], preservedDraftIds: [], unresolvedReferences: [] };
  const archive = new Map(input.archive.map(row => [row.assetId, row]));
  const mappings = new Map<string, ReadyAssetMapping>();
  const targets = new Set<string>(); const playbackTargets = new Set<string>(); const playback = new Map<string, string>();
  for (const map of input.mappings) {
    const source = archive.get(map.livepeer_asset_id);
    if (map.state !== 'ready' || !source || source.sha256 !== map.source_sha256 || source.sizeBytes !== map.source_bytes || source.playbackId !== map.livepeer_playback_id ||
        !isVideoAssetId(map.frameworks_asset_id) || !isVideoAssetId(map.frameworks_playback_id)) {
      throw new Error('Mapping is not ready or does not match its archived source');
    }
    if (mappings.has(map.livepeer_asset_id) || targets.has(map.frameworks_asset_id) || playbackTargets.has(map.frameworks_playback_id)) throw new Error('Duplicate mapping identity');
    mappings.set(map.livepeer_asset_id, map); targets.add(map.frameworks_asset_id); playbackTargets.add(map.frameworks_playback_id);
    if (map.livepeer_playback_id) {
      const prior = playback.get(map.livepeer_playback_id);
      if (prior && prior !== map.frameworks_playback_id) throw new Error('Ambiguous legacy playback mapping');
      playback.set(map.livepeer_playback_id, map.frameworks_playback_id);
    }
  }
  const videoIds = new Set<number>();
  for (const row of input.videos) {
    if (!Number.isSafeInteger(row.id) || row.id <= 0 || videoIds.has(row.id)) throw new Error('Invalid or duplicate video row identity');
    videoIds.add(row.id);
    const map = mappings.get(row.livepeer_asset_id || row.asset_id);
    if (!map) {
      if (['published','minted'].includes(row.status)) plan.blockers.push(`Published video ${row.id} has no verified ready mapping`);
      else plan.preservedDraftIds.push(row.id);
      continue;
    }
    if ((row.livepeer_asset_id && row.livepeer_asset_id !== map.livepeer_asset_id) ||
        (row.livepeer_playback_id && row.livepeer_playback_id !== map.livepeer_playback_id) ||
        (row.frameworks_asset_id && row.frameworks_asset_id !== map.frameworks_asset_id) ||
        (row.frameworks_playback_id && row.frameworks_playback_id !== map.frameworks_playback_id)) {
      plan.blockers.push(`Video ${row.id} has conflicting preserved provider identities`); continue;
    }
    const alreadyMapped = row.asset_id === map.frameworks_asset_id && row.playback_id === map.frameworks_playback_id && row.provider === 'frameworks';
    if (!alreadyMapped && (row.asset_id !== map.livepeer_asset_id || row.playback_id !== map.livepeer_playback_id)) {
      plan.blockers.push(`Video ${row.id} no longer matches the source identity`); continue;
    }
    const before: Values = {}; for (const key of identityColumns) before[key] = row[key] ?? null;
    const after: Values = { asset_id: map.frameworks_asset_id, playback_id: map.frameworks_playback_id, provider:'frameworks',
      livepeer_asset_id: map.livepeer_asset_id, livepeer_playback_id: map.livepeer_playback_id,
      frameworks_asset_id:map.frameworks_asset_id, frameworks_playback_id:map.frameworks_playback_id };
    if (row.parent_playback_id) {
      const target = playback.get(row.parent_playback_id);
      if (target) { before.parent_playback_id=row.parent_playback_id; after.parent_playback_id=target; }
      else if (!playbackTargets.has(row.parent_playback_id)) plan.unresolvedReferences.push({ table:'video_assets',id:row.id,field:'parent_playback_id',value:row.parent_playback_id });
    }
    if (alreadyMapped) {
      if (!after.parent_playback_id || after.parent_playback_id === before.parent_playback_id) continue;
      for (const key of identityColumns) { before[key]=row[key] ?? null; after[key]=row[key] ?? null; }
    }
    plan.patches.push({ table:'video_assets', id:row.id, before, after, expectedUpdatedAt:row.updated_at, mapping:map });
  }
  const referenceIds = new Set<string>();
  for (const row of input.references) {
    const fields = referenceFields[row.table];
    if (!fields) throw new Error('Unsupported reference table');
    const key = `${row.table}:${row.id}`; if(referenceIds.has(key)) throw new Error('Duplicate reference row'); referenceIds.add(key);
    const before: Values = {}; const after: Values = {};
    for (const [field,kind] of Object.entries(fields)) {
      const value = row.values[field]; if (!value) continue;
      const target = kind === 'asset' ? mappings.get(value)?.frameworks_asset_id : playback.get(value);
      if (target && target !== value) { before[field]=value; after[field]=target; }
      else if (!target && !(kind === 'asset' ? targets : playbackTargets).has(value)) plan.unresolvedReferences.push({ table:row.table,id:row.id,field,value });
    }
    if (Object.keys(after).length) plan.patches.push({ table:row.table,id:row.id,before,after,expectedUpdatedAt:row.updated_at });
  }
  return plan;
}

function literal(value: string | number | null): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') { if (!Number.isSafeInteger(value)) throw new Error('Invalid numeric identity'); return String(value); }
  if (value.includes('\0')) throw new Error('Invalid SQL value');
  return `'${value.replaceAll("'", "''")}'`;
}
function checkedValues(table: IdentityPatch['table'], values: Values): [string,string | null][] {
  const allowed = table === 'video_assets' ? [...identityColumns,'parent_playback_id'] : Object.keys(referenceFields[table] ?? {});
  const pairs=Object.entries(values);
  if (!pairs.length || pairs.some(([field]) => !allowed.includes(field))) throw new Error('Unsupported identity column');
  return pairs;
}
function condition(table: IdentityPatch['table'], values: Values): string {
  return checkedValues(table,values).map(([key,value]) => `${key} IS NOT DISTINCT FROM ${literal(value)}`).join(' AND ');
}
/** Transactional, guarded SQL only; a separate operator action is required to apply it. */
export function renderAssetRemapSql(plan: RemapPlan, direction: 'apply' | 'rollback'): string {
  if (plan.blockers.length || plan.unresolvedReferences.length) throw new Error('Resolve published coverage and historical reference exceptions before generating executable SQL');
  const statements = ['BEGIN;', 'SET LOCAL standard_conforming_strings = on;'];
  const patches = direction === 'apply' ? plan.patches : [...plan.patches].reverse();
  for (const patch of patches) {
    const before = direction === 'apply' ? patch.before : patch.after;
    const after = direction === 'apply' ? patch.after : patch.before;
    const assignments=checkedValues(patch.table,after).map(([key,value])=>`${key}=${literal(value)}`).join(', ');
    const id=`id=${literal(patch.id)}`;
    const expectedTime=direction==='apply' && patch.expectedUpdatedAt ? ` AND updated_at=${literal(patch.expectedUpdatedAt)}::timestamptz` : '';
    const map = patch.mapping;
    const mappingGuard=map && direction==='apply' ? ` AND EXISTS (SELECT 1 FROM public.frameworks_asset_imports WHERE livepeer_asset_id=${literal(map.livepeer_asset_id)}::uuid AND state='ready' AND frameworks_asset_id=${literal(map.frameworks_asset_id)} AND frameworks_playback_id=${literal(map.frameworks_playback_id)} AND source_sha256=${literal(map.source_sha256)} AND source_bytes=${map.source_bytes})` : '';
    statements.push(`WITH changed AS (UPDATE public.${patch.table} SET ${assignments} WHERE ${id} AND ${condition(patch.table,before)}${expectedTime}${mappingGuard} RETURNING id)\nSELECT 1 / CASE WHEN (SELECT count(*) FROM changed)=1 OR EXISTS (SELECT 1 FROM public.${patch.table} WHERE ${id} AND ${condition(patch.table,after)}${mappingGuard}) THEN 1 ELSE 0 END AS identity_guard;`);
  }
  statements.push('COMMIT;'); return statements.join('\n\n')+'\n';
}
