/** Copy reviewed ready import mappings from QA into prod. Dry-run by default. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  applyImportMappingCopyPlan,
  executeImportMappingCopySql,
} from '../lib/video-provider/migration/import-mapping-apply';
import {
  assertProdImportSupabaseUrl,
  assertQaMigrationSupabaseUrl,
  buildImportMappingCopyPlan,
  parseImportLedgerRows,
  renderImportMappingCopySql,
  type ImportLedgerRow,
} from '../lib/video-provider/migration/import-mapping-copy';
import { fetchImportLedgerRows } from '../lib/video-provider/migration/import-mapping-ledger';

const columns =
  'livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,state,frameworks_asset_id,frameworks_playback_id,created_at,updated_at';

async function loadLedger(db: SupabaseClient): Promise<ImportLedgerRow[]> {
  return fetchImportLedgerRows((from, to) =>
    db
      .from('frameworks_asset_imports')
      .select(columns)
      .order('livepeer_asset_id')
      .range(from, to),
  );
}

async function main() {
  const args = process.argv.slice(2);
  let output: string | undefined;
  let sourceSnapshot: string | undefined;
  let targetSnapshot: string | undefined;
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const value = () => {
      const v = args[++i];
      if (!v || v.startsWith('--')) throw new Error('Missing command option value');
      return v;
    };
    switch (args[i]) {
      case '--output':
        output = value();
        break;
      case '--source-snapshot':
        sourceSnapshot = value();
        break;
      case '--target-snapshot':
        targetSnapshot = value();
        break;
      case '--apply':
        apply = true;
        break;
      default:
        throw new Error(
          'Use [--source-snapshot PATH --target-snapshot PATH] or QA/prod env credentials, [--output NEW_PRIVATE_DIRECTORY] [--apply]',
        );
    }
  }

  let source: ImportLedgerRow[];
  let target: ImportLedgerRow[];
  let mode: 'snapshot' | 'live-read' | 'live-apply' = 'snapshot';

  if (sourceSnapshot && targetSnapshot) {
    source = parseImportLedgerRows(
      JSON.parse(await readFile(sourceSnapshot, 'utf8')),
    );
    target = parseImportLedgerRows(
      JSON.parse(await readFile(targetSnapshot, 'utf8')),
    );
  } else if (!sourceSnapshot && !targetSnapshot) {
    const sourceUrl = process.env.FRAMEWORKS_MIGRATION_SUPABASE_URL;
    const sourceKey = process.env.FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY;
    const targetUrl = process.env.FRAMEWORKS_PROD_IMPORT_SUPABASE_URL;
    const targetKey =
      process.env.FRAMEWORKS_PROD_IMPORT_SUPABASE_SERVICE_ROLE_KEY;
    assertQaMigrationSupabaseUrl(sourceUrl);
    assertProdImportSupabaseUrl(targetUrl);
    if (!sourceKey || !targetKey) {
      throw new Error(
        'Explicit QA and prod service-role credentials are required',
      );
    }
    const sourceDb = createClient(sourceUrl!, sourceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const targetDb = createClient(targetUrl!, targetKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    source = await loadLedger(sourceDb);
    target = await loadLedger(targetDb);
    mode = apply ? 'live-apply' : 'live-read';
  } else {
    throw new Error(
      'Provide both --source-snapshot and --target-snapshot, or neither for live database reads',
    );
  }

  const plan = buildImportMappingCopyPlan({ source, target });
  const readyMappings = plan.items
    .filter((item) => item.action !== 'conflict')
    .map((item) => item.row);

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    connection: mode,
    sourceTotal: plan.sourceTotal,
    sourceReadyCount: plan.sourceReadyCount,
    sourceSkippedNonReady: plan.sourceSkippedNonReady,
    targetExistingCount: plan.targetExistingCount,
    plannedInserts: plan.plannedInserts,
    skippedIdentical: plan.skippedIdentical,
    conflicts: plan.conflicts,
    executable: plan.executable,
    databaseWrites: apply && plan.executable ? plan.plannedInserts : 0,
    conflictSamples: plan.items
      .filter((i) => i.action === 'conflict')
      .slice(0, 5)
      .map((i) => ({
        livepeer_asset_id: i.row.livepeer_asset_id,
        reason: i.reason,
      })),
  };

  if (output) {
    const dir = resolve(output);
    await mkdir(dir, { mode: 0o700 });
    await writeFile(
      resolve(dir, 'report.json'),
      `${JSON.stringify({ summary, plan }, null, 2)}\n`,
      { mode: 0o600, flag: 'wx' },
    );
    await writeFile(
      resolve(dir, 'ready-mappings.json'),
      `${JSON.stringify(readyMappings, null, 2)}\n`,
      { mode: 0o600, flag: 'wx' },
    );
    if (plan.executable) {
      const applySql = renderImportMappingCopySql(plan, 'apply');
      const rollbackSql = renderImportMappingCopySql(plan, 'rollback');
      await writeFile(resolve(dir, 'apply.sql'), applySql, {
        mode: 0o600,
        flag: 'wx',
      });
      await writeFile(resolve(dir, 'rollback.sql'), rollbackSql, {
        mode: 0o600,
        flag: 'wx',
      });
    }
  }

  if (apply) {
    assertProdImportSupabaseUrl(process.env.FRAMEWORKS_PROD_IMPORT_SUPABASE_URL);
    const connection = process.env.FRAMEWORKS_PROD_IMPORT_DATABASE_URL;
    if (
      !connection ||
      !connection.includes('zdeiezfoemibjgrkyzvs') ||
      !connection.startsWith('postgresql')
    ) {
      throw new Error(
        'FRAMEWORKS_PROD_IMPORT_DATABASE_URL must be an explicit production postgres session URL',
      );
    }
    await applyImportMappingCopyPlan(plan, (sql) =>
      executeImportMappingCopySql(connection, sql),
    );
  }

  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Import mapping copy failed',
  );
  process.exitCode = 1;
});