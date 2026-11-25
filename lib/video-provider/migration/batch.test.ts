import {expect,it,vi} from 'vitest';
import {runVerifiedImportBatch,type MigrationMode} from './batch';
import type {LedgerReservationState} from './reservation-state';
const inspectImport=(state:LedgerReservationState)=>({import:{state}});
import type {ArchivedSource} from './archive';
import {ImportStoppedError} from './import-failure';
import {requestMigrationImport} from './import-request';
const one:ArchivedSource={assetId:'11111111-1111-4111-8111-111111111111',playbackId:'old-one',sha256:'a'.repeat(64),sizeBytes:100};
const two:ArchivedSource={...one,assetId:'22222222-2222-4222-8222-222222222222'};
const ready=(source:ArchivedSource)=>({outcome:{state:'ready' as const,sourceId:source.assetId,action:'unchanged' as const}});

it('prepares and retries failed sources when retryFailedImports is enabled',async()=>{
 const modes:string[]=[];
 const request=vi.fn(async(mode:MigrationMode)=>{
  modes.push(mode);
  if(mode==='inspect-import')return inspectImport('failed');
  if(mode==='prepare-retry')return {};
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  return {outcome:{state:'ready' as const,sourceId:one.assetId,action:'created' as const}};
 });
 await runVerifiedImportBatch({sources:[one],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true});
 expect(modes).toEqual(['inspect-import','prepare-retry','retry-import','inspect-playback']);
});
it('prepare-retries when an in-flight poll records failed and continues the batch',async()=>{
 const modes:string[]=[];
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  modes.push(`${mode}:${source.assetId}`);
  if(mode==='inspect-import')return inspectImport(source===one?'processing':'missing');
  if(mode==='poll' && source===one)return {outcome:{state:'failed' as const,sourceId:source.assetId,action:'polled' as const}};
  if(mode==='prepare-retry')return {};
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'created' as const}};
 });
 const result=await runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true});
 expect(result.completed).toEqual([one.assetId,two.assetId]);
 expect(modes).toContain(`poll:${one.assetId}`);
 expect(modes).toContain(`prepare-retry:${one.assetId}`);
 expect(modes).toContain(`retry-import:${one.assetId}`);
 expect(modes).toContain(`prepare-retry:${two.assetId}`);
});
it('prepare-retries when a pending poll records failed and continues the batch',async()=>{
 const modes:string[]=[];
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  modes.push(`${mode}:${source.assetId}`);
  if(mode==='inspect-import')return inspectImport(source===one?'importing':'missing');
  if(mode==='poll' && source===one)return {outcome:{state:(modes.filter(line=>line.startsWith(`poll:${one.assetId}`)).length>1?'failed':'processing') as 'processing'|'failed',sourceId:source.assetId,action:'polled' as const}};
  if(mode==='prepare-retry')return {};
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'created' as const}};
 });
 const result=await runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true});
 expect(result.completed).toEqual([one.assetId,two.assetId]);
 expect(modes.filter(line=>line.startsWith(`poll:${one.assetId}`))).toHaveLength(2);
 expect(modes).toContain(`prepare-retry:${one.assetId}`);
 expect(modes).toContain(`prepare-retry:${two.assetId}`);
});
it('stops the batch when poll fails and does not prepare-retry later sources',async()=>{
 const modes:MigrationMode[]=[];
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  modes.push(mode);
  if(mode==='inspect-import')return inspectImport(source===one?'processing':'failed');
  if(mode==='poll' && source===one)throw new Error('Matching reservation required');
  if(mode==='prepare-retry')return {};
  return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'created' as const}};
 });
 const third:ArchivedSource={...one,assetId:'33333333-3333-4333-8333-333333333333'};
 await expect(runVerifiedImportBatch({sources:[one,two,third],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true})).rejects.toThrow(`Batch stopped at source ${one.assetId}`);
 expect(modes).toEqual(['inspect-import','poll']);
 expect(request).toHaveBeenCalledTimes(2);
});
it('routes missing, failed, prepared, in-flight and ready sources in a mixed retry batch',async()=>{
 const modes:string[]=[];
 const readySrc:ArchivedSource={...one,assetId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'};
 const prepared:ArchivedSource={...one,assetId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const failed:ArchivedSource={...one,assetId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
 const missing:ArchivedSource={...one,assetId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
 const inflight:ArchivedSource={...one,assetId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'};
 let inflightPolls=0;
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  modes.push(`${mode}:${source.assetId}`);
  if(mode==='inspect-import'){
    if(source===readySrc)return inspectImport('ready');
    if(source===prepared)return inspectImport('prepared');
    if(source===failed)return inspectImport('failed');
    if(source===inflight)return inspectImport('importing');
    return inspectImport('missing');
  }
  if(mode==='poll' && source===inflight){
    inflightPolls+=1;
    return {outcome:{state:(inflightPolls>1?'ready':'processing') as 'ready'|'processing',sourceId:source.assetId,action:'polled' as const}};
  }
  if(mode==='prepare-retry')return {};
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'created' as const}};
 });
 const result=await runVerifiedImportBatch({sources:[readySrc,prepared,failed,missing,inflight],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true});
 expect(result.completed).toHaveLength(5);
 expect(modes.filter(line=>line.startsWith('prepare-retry'))).toEqual([`prepare-retry:${failed.assetId}`,`prepare-retry:${missing.assetId}`]);
 expect(modes).toContain(`retry-import:${prepared.assetId}`);
 expect(modes).not.toContain(`prepare-retry:${prepared.assetId}`);
 expect(modes).not.toContain(`poll:${readySrc.assetId}`);
 expect(modes).not.toContain(`retry-import:${readySrc.assetId}`);
 expect(modes).toContain(`poll:${inflight.assetId}`);
});
it('routes missing through prepare-retry and prepared through retry-import without polling',async()=>{
 const modes:MigrationMode[]=[];
 const prepared:ArchivedSource={...one,assetId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const missing:ArchivedSource={...one,assetId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  modes.push(mode);
  if(mode==='inspect-import')return inspectImport(source===prepared?'prepared':'missing');
  if(mode==='prepare-retry')return {};
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'created' as const}};
 });
 await runVerifiedImportBatch({sources:[prepared,missing],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true});
 expect(modes.filter(mode=>mode==='poll')).toHaveLength(0);
 expect(modes).toEqual(['inspect-import','retry-import','inspect-playback','inspect-import','prepare-retry','retry-import','inspect-playback']);
});
it('stops a retry batch when inspect-import fails unexpectedly',async()=>{
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  if(mode==='inspect-import'&&source===one)throw new Error('Ledger read unavailable');
  return inspectImport('missing');
 });
 await expect(runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true})).rejects.toThrow(`Batch stopped at source ${one.assetId}`);
 expect(request).toHaveBeenCalledTimes(1);
});
it('leaves ready reservations untouched',async()=>{
 const modes:string[]=[];
 const request=vi.fn(async(mode:MigrationMode)=>{
  modes.push(mode);
  if(mode==='inspect-import')return inspectImport('ready');
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  return {};
 });
 await runVerifiedImportBatch({sources:[one],request,report:vi.fn(),wait:async()=>{},retryFailedImports:true});
 expect(modes).toEqual(['inspect-import','inspect-playback']);
});
it('uploads sequentially while earlier sources process, then verifies every source',async()=>{
 let polled=false;
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  if(mode==='inspect-playback')return {diagnostic:{playableManifest:true}};
  if(source===one&&!polled){if(mode==='poll')polled=true;return {outcome:{state:'processing' as const,sourceId:source.assetId,action:'polled' as const}};}
  return ready(source);
 });
 const report=vi.fn(),wait=vi.fn(async()=>{});
 const result=await runVerifiedImportBatch({sources:[one,two],request,report,wait});
 expect(result).toEqual({completed:[one.assetId,two.assetId],stopped:false});
 expect(request.mock.calls.map(([mode,source])=>[mode,source.assetId])).toEqual([['import',one.assetId],['import',two.assetId],['inspect-playback',two.assetId],['poll',one.assetId],['poll',one.assetId],['inspect-playback',one.assetId]]);
 expect(report).toHaveBeenLastCalledWith({completed:2,total:2,sourceId:one.assetId,phase:'ready'});
});
it.each(['ambiguous','importing','failed','prepared'] as const)('stops on %s without retrying creation or continuing',async state=>{
 const request=vi.fn(async()=>({outcome:{state,sourceId:one.assetId,action:'needs-reconciliation' as const}}));
 await expect(runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{}})).rejects.toThrow('no creation retry');
 expect(request).toHaveBeenCalledTimes(1);
});
it('stops uncertain requests without exposing provider details',async()=>{
 const request=vi.fn(async()=>{throw new Error('PRIVATE_URL?jwt=PRIVATE');});
 await expect(runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{}})).rejects.toThrow(`Batch stopped at source ${one.assetId}; inspect its reservation before resuming`);
 expect(request).toHaveBeenCalledTimes(1);
});
it('preserves import stop classification through the HTTP helper and adds batch source context',async()=>{
 const importFetch=vi.fn(async()=>new Response(JSON.stringify({error:'Import stopped during protected upload preparation (policy-unconfirmed). Inspect its reservation before retrying.',failureCode:'policy-unconfirmed'}),{status:409,headers:{'Content-Type':'application/json'}}));
 const request=async(mode:MigrationMode,source:ArchivedSource)=>(await requestMigrationImport({mode,source},{fetch:importFetch,url:'https://staging.example/api/migration/frameworks/import'})) as {outcome?:{state:'ready'|'processing';sourceId:string;action:string};diagnostic?:{playableManifest:boolean}};
 await expect(runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{}})).rejects.toSatisfy((error:unknown)=>{
  expect(error).toBeInstanceOf(ImportStoppedError);
  const stopped=error as ImportStoppedError;
  expect(stopped.failureCode).toBe('policy-unconfirmed');
  expect(stopped.message).toContain(`Batch stopped at source ${one.assetId}`);
  expect(stopped.message).toContain('policy-unconfirmed');
  return true;
 });
 expect(importFetch).toHaveBeenCalledOnce();
});
it('does not accept stored assets whose playback check fails',async()=>{
 const request=vi.fn(async(mode:MigrationMode)=>mode==='inspect-playback'?{diagnostic:{playableManifest:false}}:ready(one));
 await expect(runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{}})).rejects.toThrow('playback verification has not passed');
 expect(request).toHaveBeenCalledTimes(2);
});
it('paces every request when resuming ready sources, including manifest checks',async()=>{
 const calls:string[]=[];
 const request=vi.fn(async(mode:MigrationMode,source:ArchivedSource)=>{
  calls.push(mode);return mode==='inspect-playback'?{diagnostic:{playableManifest:true}}:ready(source);
 });
 await runVerifiedImportBatch({sources:[one,two],request,report:vi.fn(),wait:async()=>{calls.push('wait');}});
 expect(calls).toEqual(['import','wait','inspect-playback','wait','import','wait','inspect-playback']);
});
it('bounds polling and stops safely between completed sources',async()=>{
 const pending=vi.fn(async()=>({outcome:{state:'processing' as const,sourceId:one.assetId,action:'polled' as const}}));
 await expect(runVerifiedImportBatch({sources:[one],request:pending,report:vi.fn(),wait:async()=>{},maxPolls:2})).rejects.toThrow('more processing time');expect(pending).toHaveBeenCalledTimes(3);
 let stop=false;
 const request=vi.fn(async(mode:MigrationMode)=>mode==='inspect-playback'?{diagnostic:{playableManifest:true}}:ready(one));
 const result=await runVerifiedImportBatch({sources:[one,two],request,wait:async()=>{},shouldStop:()=>stop,report:p=>{if(p.phase==='ready')stop=true;}});
 expect(result).toEqual({completed:[one.assetId],stopped:true});expect(request).toHaveBeenCalledTimes(2);
});
