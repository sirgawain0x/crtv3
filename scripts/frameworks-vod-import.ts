/** Dry-run by default. Execution is restricted to the isolated QA database; no production switch/remap. */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { archivedSourcesFromManifests } from '../lib/video-provider/migration/archive';
import { runAssetImport } from '../lib/video-provider/migration/importer';
import { createImportLedger } from '../lib/video-provider/migration/supabase-ledger';
import { openLocalImportSource } from '../lib/video-provider/migration/local-source';
import { createFrameworksImportProvider } from '../lib/video-provider/migration/frameworks-import-provider';
import { requireVodSigningKeyId } from '../lib/video-provider/frameworks/vod-policy';

async function main() {
  const args=process.argv.slice(2); const manifests:string[]=[];
  let sourceId:string|undefined,filePath:string|undefined,execute=false,poll=false;
  for(let i=0;i<args.length;i++) {
    const value=()=>{const v=args[++i];if(!v || v.startsWith('--'))throw new Error('Missing command option value');return v;};
    switch(args[i]) {
      case '--manifest':manifests.push(value());break;
      case '--source':sourceId=value();break;
      case '--file':filePath=value();break;
      case '--execute':execute=true;break;
      case '--poll':poll=true;break;
      default:throw new Error('Unknown option. Use --manifest PATH [--source ID --file PATH --execute] or --source ID --poll --execute.');
    }
  }
  if(!manifests.length)throw new Error('At least one --manifest PATH is required');
  const archive=archivedSourcesFromManifests(await Promise.all(manifests.map(async path=>JSON.parse(await readFile(path,'utf8')))));
  const sources=sourceId?archive.filter(row=>row.assetId===sourceId):archive;
  if(!sources.length)throw new Error('Source is not covered by a verified archive manifest');
  if(!execute) {
    const file=filePath?await openLocalImportSource(filePath):null;
    try {
      if(file){if(sources.length!==1)throw new Error('--file requires one --source ID');await file.verify(sources[0]);}
      console.log(JSON.stringify({mode:'dry-run',sourceCount:sources.length,totalBytes:sources.reduce((n,row)=>n+row.sizeBytes,0),
        localFileVerified:!!file,providerRequests:0,databaseWrites:0}));
    } finally {await file?.close();}
    return;
  }
  if(sources.length!==1 || !sourceId)throw new Error('Execution requires exactly one --source ID');
  if(poll && filePath)throw new Error('--poll does not transfer a local file');
  const url=process.env.FRAMEWORKS_MIGRATION_SUPABASE_URL;
  const key=process.env.FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY;
  if(url!=='https://zxpobpucayevlrzdxhmr.supabase.co' || !key)throw new Error('Explicit isolated QA migration database credentials are required; production execution is disabled');
  requireVodSigningKeyId();
  if(!process.env.FRAMEWORKS_API_TOKEN?.trim())throw new Error('FrameWorks server credential is unavailable');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const file=filePath?await openLocalImportSource(filePath):undefined;
  try {
    const outcome=await runAssetImport({source:sources[0],ledger:createImportLedger(db),provider:createFrameworksImportProvider(),file});
    console.log(JSON.stringify({mode:poll?'poll':'execute',...outcome}));
  } finally {await file?.close();}
}
main().catch(error=>{
  // Only local validation messages are surfaced; provider/upload failures are redacted by their boundary.
  console.error(error instanceof Error?error.message:'Migration command failed');process.exitCode=1;
});
