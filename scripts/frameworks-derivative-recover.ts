/**
 * Operator CLI for a reviewed derivative recovery.
 *
 * Dry-run by default: nothing is uploaded and nothing is written unless
 * --execute is passed. Each stage is separate so the operator sees the reviewed
 * plan, then the verified upload, then provider readiness, then adoption.
 *
 * Usage:
 *   --manifest PATH --source ID --plan PATH [--derivative PATH] --prepare|--upload|--ready|--adopt [--execute]
 *
 * Credentials come from FRAMEWORKS_MIGRATION_SUPABASE_URL and
 * FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY — never the app's implicit
 * production client.
 */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { archivedSourcesFromManifests } from '../lib/video-provider/migration/archive';
import {
  adoptReviewedDerivative,
  confirmReviewedDerivativeReady,
  prepareReviewedDerivativeRecovery,
  resolveReviewedDerivativePlan,
  uploadReviewedDerivative,
} from '../lib/video-provider/migration/reviewed-derivative';

type Stage = 'prepare' | 'upload' | 'ready' | 'adopt';

async function main() {
  const args = process.argv.slice(2);
  let manifestPath: string | undefined;
  let sourceId: string | undefined;
  let planPath: string | undefined;
  let derivativePath: string | undefined;
  let stage: Stage | undefined;
  let execute = false;

  for (let i = 0; i < args.length; i++) {
    const value = () => {
      const v = args[++i];
      if (!v || v.startsWith('--')) throw new Error('Missing option value');
      return v;
    };
    switch (args[i]) {
      case '--manifest': manifestPath = value(); break;
      case '--source': sourceId = value(); break;
      case '--plan': planPath = value(); break;
      case '--derivative': derivativePath = value(); break;
      case '--execute': execute = true; break;
      case '--prepare': stage = 'prepare'; break;
      case '--upload': stage = 'upload'; break;
      case '--ready': stage = 'ready'; break;
      case '--adopt': stage = 'adopt'; break;
      default:
        throw new Error('Unknown option. Use --manifest PATH --source ID --plan PATH [--derivative PATH] --prepare|--upload|--ready|--adopt [--execute]');
    }
  }

  if (!manifestPath || !sourceId || !planPath || !stage) {
    throw new Error('--manifest, --source, --plan and exactly one stage are required');
  }

  const plans = JSON.parse(await readFile(planPath, 'utf8'));
  const archive = archivedSourcesFromManifests([JSON.parse(await readFile(manifestPath, 'utf8'))]);
  const source = archive.find((row) => row.assetId === sourceId);
  if (!source) throw new Error('Source is not covered by the archive manifest');

  // Refuse before any side effect if the plan does not cover this source exactly.
  const plan = resolveReviewedDerivativePlan(source, plans);

  const summary = {
    stage,
    mode: execute ? 'execute' : 'dry-run',
    livepeerAssetId: plan.livepeerAssetId,
    originalBytes: plan.originalBytes,
    derivativeBytes: plan.derivativeBytes,
    derivativeOrigin: plan.derivativeOrigin,
    approvedBy: plan.approvedBy,
    approvedAt: plan.approvedAt,
  };

  if (!execute) {
    console.log(JSON.stringify({ ...summary, providerRequests: 0, databaseWrites: 0 }));
    return;
  }

  const url = process.env.FRAMEWORKS_MIGRATION_SUPABASE_URL;
  const key = process.env.FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Migration database credentials are required to execute');
  const db = createClient(url, key, { auth: { persistSession: false } });

  switch (stage) {
    case 'prepare':
      await prepareReviewedDerivativeRecovery(db, source, plans);
      break;
    case 'upload': {
      if (!derivativePath) throw new Error('--derivative PATH is required to upload');
      await uploadReviewedDerivative(db, source, await readFile(derivativePath), plans);
      break;
    }
    case 'ready':
      await confirmReviewedDerivativeReady(db, source, plans);
      break;
    case 'adopt':
      await adoptReviewedDerivative(db, source, plans);
      break;
  }

  console.log(JSON.stringify({ ...summary, completed: true }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Derivative recovery failed');
  process.exit(1);
});
