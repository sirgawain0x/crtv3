/**
 * Operator CLI for a reviewed derivative recovery.
 *
 * Dry-run by default: nothing is uploaded and nothing is written unless
 * --execute is passed. Each stage is separate so the operator sees the reviewed
 * plan, then the verified upload, then provider readiness, then adoption.
 *
 * Usage:
 *   --manifest PATH --source ID [--plan PATH] --prepare|--upload|--ready|--adopt [--execute]
 *
 * Authorisation comes from the checked-in reviewed plans. A --plan file is
 * optional and is only accepted when it matches a reviewed record exactly.
 *
 * Credentials come from FRAMEWORKS_MIGRATION_SUPABASE_URL and
 * FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY — never the app's implicit
 * production client.
 */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { archivedSourcesFromManifests } from '../lib/video-provider/migration/archive';
import {
  ADOPTION_STATUSES,
  TRANSFER_STATUSES,
  adoptReviewedDerivative,
  approvedDerivativePlans,
  assertPlanMatchesReviewed,
  confirmReviewedDerivativeReady,
  prepareReviewedDerivativeRecovery,
  resolveReviewedDerivativePlan,
  uploadAuthorizedPlans,
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
  let selfCheck = false;

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
      case '--self-check': selfCheck = true; break;
      case '--prepare': stage = 'prepare'; break;
      case '--upload': stage = 'upload'; break;
      case '--ready': stage = 'ready'; break;
      case '--adopt': stage = 'adopt'; break;
      default:
        throw new Error('Unknown option. Use --manifest PATH --source ID --plan PATH [--derivative PATH] --prepare|--upload|--ready|--adopt [--execute]');
    }
  }

  // Load the modules the adopt stage needs, without touching the provider or the
  // database. `server-only` throws in a plain Node process, so this check exists
  // to prove the executable path loads outside Next.js before anyone relies on it.
  if (selfCheck) {
    const { inspectMigrationPlayback } = await import('../lib/video-provider/migration/inspect-playback');
    const { createFrameworksImportProvider } = await import('../lib/video-provider/migration/frameworks-import-provider');
    const provider = createFrameworksImportProvider();
    console.log(JSON.stringify({
      selfCheck: 'ok',
      adoptPathLoaded: typeof inspectMigrationPlayback === 'function',
      providerAdapterLoaded: typeof provider.createProtectedUpload === 'function',
      approvedPlans: approvedDerivativePlans().length,
      uploadAuthorizedPlans: uploadAuthorizedPlans().length,
      providerRequests: 0,
      databaseWrites: 0,
    }));
    return;
  }

  if (!manifestPath || !sourceId || !stage) {
    throw new Error('--manifest, --source and exactly one stage are required (--plan is optional and only verified)');
  }

  const archive = archivedSourcesFromManifests([JSON.parse(await readFile(manifestPath, 'utf8'))]);
  const source = archive.find((row) => row.assetId === sourceId);
  if (!source) throw new Error('Source is not covered by the archive manifest');

  // Execution is authorised by the checked-in reviewed plans, never by a local
  // file. A supplied --plan is only accepted when it matches a reviewed record
  // field for field, so an "approved" local JSON cannot authorize a substitution.
  if (planPath) {
    assertPlanMatchesReviewed(JSON.parse(await readFile(planPath, 'utf8')));
  }

  // Refuse before any side effect if the reviewed set does not cover this source.
  // Adoption needs stage two; every other stage needs stage one.
  const plan = resolveReviewedDerivativePlan(
    source,
    undefined,
    stage === 'adopt' ? ADOPTION_STATUSES : TRANSFER_STATUSES,
  );

  const summary = {
    stage,
    mode: execute ? 'execute' : 'dry-run',
    planStatus: plan.status,
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
      await prepareReviewedDerivativeRecovery(db, source);
      break;
    case 'upload': {
      if (!derivativePath) throw new Error('--derivative PATH is required to upload');
      await uploadReviewedDerivative(db, source, await readFile(derivativePath));
      break;
    }
    case 'ready':
      await confirmReviewedDerivativeReady(db, source);
      break;
    case 'adopt':
      await adoptReviewedDerivative(db, source);
      break;
  }

  console.log(JSON.stringify({ ...summary, completed: true }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Derivative recovery failed');
  process.exit(1);
});
