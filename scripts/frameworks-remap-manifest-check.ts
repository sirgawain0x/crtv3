/**
 * Pre-window check: does the archive manifest cover every mapping the remap will consume?
 *
 * Runs before the production window and without any database access. It uses the same parser as the
 * remap (`archivedSourcesFromManifests`), so a manifest that passes here is one the remap will accept.
 * A failure here is cheap; the same failure inside the window means the release stops.
 */
import {readFile} from 'node:fs/promises';
import {archivedSourcesFromManifests} from '../lib/video-provider/migration/archive';
import {createHash} from 'node:crypto';

type ExpectedRow={assetId:string;playbackId:string;sha256:string;sizeBytes:number};

function arg(name:string,required=true):string[]{
 const out:string[]=[];
 for(let i=2;i<process.argv.length;i++)if(process.argv[i]===name&&process.argv[i+1])out.push(process.argv[++i]);
 if(required&&!out.length)throw new Error(`Missing ${name}`);
 return out;
}

function isExpectedRow(value:unknown):value is ExpectedRow{
 if(!value||typeof value!=='object')return false;
 const row=value as Record<string,unknown>;
 return typeof row.assetId==='string'&&typeof row.playbackId==='string'&&
  typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256)&&
  Number.isSafeInteger(row.sizeBytes)&&(row.sizeBytes as number)>0;
}

async function main(){
 const manifestPaths=arg('--manifest');
 const expectPath=arg('--expect')[0];
 const raw=JSON.parse(await readFile(expectPath,'utf8'));
 const expected:unknown[]=Array.isArray(raw)?raw:Array.isArray(raw?.rows)?raw.rows:[];
 if(!expected.length)throw new Error('Expected set is empty');
 if(!expected.every(isExpectedRow))throw new Error('Expected set contains an invalid row');

 const manifests=await Promise.all(manifestPaths.map(async path=>JSON.parse(await readFile(path,'utf8'))));
 const sources=archivedSourcesFromManifests(manifests);
 const byAsset=new Map(sources.map(source=>[source.assetId,source]));

 const missing:string[]=[],mismatched:Array<{assetId:string;field:string;expected:string;found:string|number|null}>=[];
 for(const row of expected as ExpectedRow[]){
  const source=byAsset.get(row.assetId);
  if(!source){missing.push(row.assetId);continue;}
  if(source.sha256!==row.sha256)mismatched.push({assetId:row.assetId,field:'sha256',expected:row.sha256,found:source.sha256});
  if(source.sizeBytes!==row.sizeBytes)mismatched.push({assetId:row.assetId,field:'sizeBytes',expected:String(row.sizeBytes),found:source.sizeBytes});
  if(source.playbackId!==row.playbackId)mismatched.push({assetId:row.assetId,field:'playbackId',expected:row.playbackId,found:source.playbackId??null});
 }

 const fingerprint=createHash('sha256')
  .update(expected.map(row=>`${row.assetId} ${row.sha256} ${row.sizeBytes}`).sort().join('\n'))
  .digest('hex');

 const summary={mode:'manifest-check',manifests:manifestPaths,manifestAssets:sources.length,
  expected:expected.length,matched:expected.length-missing.length,mismatched:mismatched.length,
  missing,fingerprint,executable:missing.length===0&&mismatched.length===0};
 console.log(JSON.stringify(summary));
 if(!summary.executable)process.exitCode=1;
}

main().catch(error=>{console.error(error instanceof Error?error.message:'Manifest check failed');process.exitCode=1;});
