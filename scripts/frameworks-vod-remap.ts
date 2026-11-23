/** Prepare a reviewable remap only. This command never connects to a database or applies SQL. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {archivedSourcesFromManifests} from '../lib/video-provider/migration/archive';
import {buildAssetCutoverPlan,renderAssetCutoverSql,type AccessVideoSnapshot} from '../lib/video-provider/migration/cutover-plan';
import type {PreservedReference} from '../lib/video-provider/migration/reference-exceptions';
import type {ReadyAssetMapping,ReferenceRow} from '../lib/video-provider/migration/remap-plan';

async function main(){
 const args=process.argv.slice(2),manifests:string[]=[];let snapshotPath:string|undefined,mappingsPath:string|undefined,output:string|undefined,exceptionsPath:string|undefined;
 for(let i=0;i<args.length;i++){
  const value=()=>{const v=args[++i];if(!v||v.startsWith('--'))throw new Error('Missing command option value');return v;};
  switch(args[i]){case '--manifest':manifests.push(value());break;case '--snapshot':snapshotPath=value();break;case '--mappings':mappingsPath=value();break;case '--output':output=value();break;case '--preserve-references':exceptionsPath=value();break;default:throw new Error('Use --snapshot PATH --mappings PATH --manifest PATH [--manifest PATH] [--output NEW_PRIVATE_DIRECTORY]');}
 }
 if(!snapshotPath||!mappingsPath||!manifests.length)throw new Error('Snapshot, ready mappings and archive manifests are required');
 const snapshot=JSON.parse(await readFile(snapshotPath,'utf8')) as {videos:AccessVideoSnapshot[];references:ReferenceRow[]};
 const mappings=JSON.parse(await readFile(mappingsPath,'utf8')) as ReadyAssetMapping[];
 if(!Array.isArray(snapshot.videos)||!Array.isArray(snapshot.references)||!Array.isArray(mappings))throw new Error('Invalid migration snapshot or mapping collection');
 const archive=archivedSourcesFromManifests(await Promise.all(manifests.map(async path=>JSON.parse(await readFile(path,'utf8')))));
 const preserveReferences:PreservedReference[]=exceptionsPath?JSON.parse(await readFile(exceptionsPath,'utf8')):[];
 if(!Array.isArray(preserveReferences))throw new Error('Invalid reference preservation exceptions');
 const plan=buildAssetCutoverPlan({...snapshot,mappings,archive,preserveReferences});
 const summary={mode:'dry-run',videoRows:snapshot.videos.length,verifiedReadyMappings:mappings.length,identityUpdates:plan.identities.patches.length,
  preservedHistoricalReferences:plan.preservedReferences.length,protectedAccessSeeds:plan.accessSeeds.length,preservedDrafts:plan.identities.preservedDraftIds.length,
  blockers:plan.identities.blockers.length+plan.blockers.length,unresolvedReferences:plan.identities.unresolvedReferences.length,
  executable:!plan.identities.blockers.length&&!plan.blockers.length&&!plan.identities.unresolvedReferences.length,databaseWrites:0};
 if(output){
  // Require a new directory; never follow a pre-existing output symlink or overwrite a reviewed plan.
  const dir=resolve(output);await mkdir(dir,{mode:0o700});
  await writeFile(resolve(dir,'plan.json'),JSON.stringify({summary,plan},null,2)+'\n',{mode:0o600,flag:'wx'});
  if(summary.executable){
   await writeFile(resolve(dir,'apply.sql'),renderAssetCutoverSql(plan,'apply'),{mode:0o600,flag:'wx'});
   await writeFile(resolve(dir,'rollback.sql'),renderAssetCutoverSql(plan,'rollback'),{mode:0o600,flag:'wx'});
  }
 }
 console.log(JSON.stringify(summary));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Remap preparation failed');process.exitCode=1;});
