/**
 * Emit resume-verification predicates for a generated remap plan.
 *
 * The comparisons come from identityStatePredicates, which shares `condition`/`literal` with the apply SQL, so a
 * NULL before-state is compared as `IS NOT DISTINCT FROM NULL` rather than `= 'null'`. Output is TSV:
 *
 *   table <TAB> id <TAB> before-predicate <TAB> after-predicate
 *
 * Usage: npx tsx scripts/frameworks-remap-verify.ts <path/to/plan.json>
 */
import { readFile } from 'node:fs/promises';
import { identityStatePredicates, type RemapPlan } from '../lib/video-provider/migration/remap-plan';

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: frameworks-remap-verify.ts <path/to/plan.json>');

  const raw = JSON.parse(await readFile(path, 'utf8')) as { plan?: { identities?: RemapPlan }; identities?: RemapPlan };
  const plan = raw.plan?.identities ?? raw.identities;
  if (!plan || !Array.isArray(plan.patches)) throw new Error('plan.json does not contain plan.identities.patches');

  const rows = identityStatePredicates(plan);
  if (!rows.length) throw new Error('Plan contains no identity patches; nothing to verify');

  for (const row of rows) process.stdout.write(`${row.table}\t${row.id}\t${row.before}\t${row.after}\n`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Remap verification preparation failed');
  process.exitCode = 1;
});
