import {expect,it,vi} from 'vitest';
import {runVerifiedImportBatch,type MigrationMode} from './batch';
import type {ArchivedSource} from './archive';
import {ImportStoppedError} from './import-failure';
import {requestMigrationImport} from './import-request';
const one:ArchivedSource={assetId:'11111111-1111-4111-8111-111111111111',playbackId:'old-one',sha256:'a'.repeat(64),sizeBytes:100};
const two:ArchivedSource={...one,assetId:'22222222-2222-4222-8222-222222222222'};
const ready=(source:ArchivedSource)=>({outcome:{state:'ready' as const,sourceId:source.assetId,action:'unchanged' as const}});
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
