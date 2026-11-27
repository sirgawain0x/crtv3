/**
 * Derives the expected mapping set that the pre-window manifest check consumes, from a production
 * snapshot plus the archive inventory and the reviewed exceptions.
 *
 * Deliberately not derived from the manifest: the point of the check is to compare two independent
 * records — what the archive says it holds (manifest) and what the import recorded it uploaded
 * (inventory). Building the expectation from the manifest would make the comparison vacuous.
 */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

type SnapshotVideo={id:number;asset_id:string;playback_id:string;status:string;livepeer_asset_id?:string|null;livepeer_playback_id?:string|null;frameworks_asset_id?:string|null;provider?:string|null};
type SourceRow={assetId:string;playbackId:string;sha256:string;sizeBytes:number};
type Exception={videoId:number;legacyAssetId:string;legacyPlaybackId:string;label:string;reason:string};
const PUBLISHED=['published','minted'];

function arg(name:string):string{
 for(let i=2;i<process.argv.length;i++)if(process.argv[i]===name&&process.argv[i+1])return process.argv[++i];
 throw new Error(`Missing ${name}`);
}
function isSourceRow(value:unknown):value is SourceRow{
 if(!value||typeof value!=='object')return false;
 const row=value as Record<string,unknown>;
 return typeof row.assetId==='string'&&typeof row.playbackId==='string'&&
  typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256)&&
  Number.isSafeInteger(row.sizeBytes)&&(row.sizeBytes as number)>0;
}

async function main(){
 const snapshotPath=arg('--snapshot'),sourcesPath=arg('--sources'),exceptionsPath=arg('--exceptions'),output=arg('--output');
 const snapshot=JSON.parse(await readFile(snapshotPath,'utf8'));
 const videos:SnapshotVideo[]=Array.isArray(snapshot?.videos)?snapshot.videos:[];
 if(!videos.length)throw new Error('Snapshot has no videos');
 const rawSources=JSON.parse(await readFile(sourcesPath,'utf8'));
 const sources:unknown[]=Array.isArray(rawSources)?rawSources:Array.isArray(rawSources?.rows)?rawSources.rows:[];
 if(!sources.length||!sources.every(isSourceRow))throw new Error('Archive inventory is empty or contains an invalid row');
 const exceptions:Exception[]=JSON.parse(await readFile(exceptionsPath,'utf8'));
 if(!Array.isArray(exceptions))throw new Error('Invalid exceptions file');

 const byAsset=new Map(sources.map(row=>[row.assetId,row]));
 const excepted=new Map(exceptions.map(row=>[row.legacyAssetId,row]));
 const published=videos.filter(video=>PUBLISHED.includes(video.status));
 const rows:{videoId:number;assetId:string;playbackId:string;sha256:string;sizeBytes:number}[]=[];
 const skipped:number[]=[],missing:string[]=[],alreadyMapped:number[]=[];

 for(const video of published){
  const identity=video.livepeer_asset_id||video.asset_id;
  const exception=excepted.get(identity);
  if(exception){
   if(exception.videoId!==video.id)throw new Error(`Exception for ${identity} names video ${exception.videoId} but the snapshot has ${video.id}`);
   if(video.playback_id!==exception.legacyPlaybackId)throw new Error(`Exception playback id for video ${video.id} does not match the snapshot`);
   skipped.push(video.id);continue;
  }
  if(video.frameworks_asset_id||video.provider==='frameworks'){alreadyMapped.push(video.id);continue;}
  const source=byAsset.get(identity);
  if(!source){missing.push(identity);continue;}
  rows.push({videoId:video.id,assetId:source.assetId,playbackId:source.playbackId,sha256:source.sha256,sizeBytes:source.sizeBytes});
 }

 const unmatchedExceptions=exceptions.filter(row=>!skipped.includes(row.videoId)).map(row=>row.videoId);
 const fingerprint=createHash('sha256')
  .update(rows.map(row=>`${row.assetId} ${row.sha256} ${row.sizeBytes}`).sort().join('\n'))
  .digest('hex');

 const summary={mode:'expected-set',published:published.length,excepted:skipped.length,alreadyMapped:alreadyMapped.length,
  expected:rows.length,missingSources:missing,fingerprint,executable:!missing.length&&!unmatchedExceptions.length};
 await writeFile(output,`${JSON.stringify({count:rows.length,fingerprint,rows},null,2)}\n`,{mode:0o600,flag:'w'});
 console.log(JSON.stringify(summary));
 if(!summary.executable)process.exitCode=1;
}

main().catch(error=>{console.error(error instanceof Error?error.message:'Expected-set derivation failed');process.exitCode=1;});
