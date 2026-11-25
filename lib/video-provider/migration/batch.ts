import type {ArchivedSource} from './archive';
import type {ImportOutcome, ImportState} from './importer';
import type {LedgerReservationState} from './reservation-state';
import {ImportStoppedError} from './import-failure';

export type MigrationMode='import'|'poll'|'inspect-playback'|'inspect-reservation'|'inspect-import'|'prepare-recovery'|'import-recovery'|'poll-recovery'|'adopt-recovery'|'prepare-retry'|'retry-import';
export type BatchProgress={completed:number;total:number;sourceId:string;phase:'importing'|'processing'|'checking'|'ready'};
type RequestResult={outcome?:ImportOutcome;diagnostic?:{playableManifest?:boolean};import?:{state:LedgerReservationState}};
/** Client orchestration only: every operation retains the existing signed-admin server boundary. */
export async function runVerifiedImportBatch(input:{
  sources:ArchivedSource[];
  request:(mode:MigrationMode,source:ArchivedSource)=>Promise<RequestResult>;
  report:(progress:BatchProgress)=>void;
  wait:()=>Promise<void>;
  shouldStop?:()=>boolean;
  maxPolls?:number;
  /** When set, reserves/resets failed rows then re-imports from the verified archive mirror. */
  retryFailedImports?:boolean;
}){
  if(!input.sources.length||input.sources.length>45)throw new Error('A verified batch must contain between 1 and 45 sources');
  const completed=new Set<string>();
  const pending:ArchivedSource[]=[];
  const polls=new Map<string,number>();
  /** At most one prepare-retry + retry-import cycle after a recorded failure per source. */
  const failureRetried=new Set<string>();
  let requested=false;
  const report=(source:ArchivedSource,phase:BatchProgress['phase'])=>input.report({completed:completed.size,total:input.sources.length,sourceId:source.assetId,phase});
  const request=async(mode:MigrationMode,source:ArchivedSource)=>{
    // All modes share the admin endpoint's 10/minute limit, including ready resumes.
    // The caller waits ten seconds between requests; never retry uncertain mutations.
    if(requested)await input.wait();
    requested=true;
    try{return await input.request(mode,source);}
    catch(error){
      if(error instanceof ImportStoppedError){
        const stopped=new ImportStoppedError(error.failureCode);
        stopped.message=`Batch stopped at source ${source.assetId}; ${error.message}`;
        throw stopped;
      }
      throw new Error(`Batch stopped at source ${source.assetId}; inspect its reservation before resuming`,error instanceof Error?{cause:error}:undefined);
    }
  };
  const finish=async(source:ArchivedSource)=>{
    report(source,'checking');
    const checked=await request('inspect-playback',source);
    if(checked.diagnostic?.playableManifest!==true)throw new Error(`Source ${source.assetId} is stored but playback verification has not passed`);
    completed.add(source.assetId);report(source,'ready');
  };
  const accept=async(source:ArchivedSource,result:RequestResult)=>{
    if(result.outcome?.sourceId!==source.assetId)throw new Error('Import response identity differs from its requested source');
    if(result.outcome.state==='ready'){await finish(source);return true;}
    if(result.outcome.state!=='processing')throw new Error(`Source ${source.assetId} needs reconciliation or more processing time; no creation retry was attempted`);
    return false;
  };
  const stopRepeatedFailure=(source:ArchivedSource):never=>{
    throw new Error(`Batch stopped at source ${source.assetId}: provider failure recorded again after retry`);
  };
  const markFailureRetried=(source:ArchivedSource)=>{
    failureRetried.add(source.assetId);
    polls.set(source.assetId,0);
  };
  const retryAfterRecordedFailure=async(source:ArchivedSource)=>{
    if(failureRetried.has(source.assetId))stopRepeatedFailure(source);
    await request('prepare-retry',source);
    const retried=await request('retry-import',source);
    markFailureRetried(source);
    return retried;
  };
  const startImport=async(source:ArchivedSource)=>{
    if(input.retryFailedImports){
      const probe=await request('inspect-import',source);
      const state=probe.import?.state;
      if(!state)throw new Error(`Source ${source.assetId} returned no import inspect state`);
      if(state==='ready'){
        return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'unchanged' as const}};
      }
      if(state==='processing'||state==='importing'){
        const polled=await request('poll',source);
        if(polled.outcome?.state==='importing'){
          return {outcome:{state:'processing' as const,sourceId:source.assetId,action:'polled' as const}};
        }
        if(polled.outcome?.state==='failed'&&polled.outcome.sourceId===source.assetId){
          return retryAfterRecordedFailure(source);
        }
        return polled;
      }
      if(state==='prepared')return request('retry-import',source);
      if(state==='missing'||state==='failed'){
        if(failureRetried.has(source.assetId))stopRepeatedFailure(source);
        await request('prepare-retry',source);
        const retried=await request('retry-import',source);
        markFailureRetried(source);
        return retried;
      }
      throw new Error(`Source ${source.assetId} is in state ${state as ImportState}; no retry route`);
    }
    return request('import',source);
  };
  for(const source of input.sources){
    if(input.shouldStop?.())break;
    report(source,'importing');
    const result=await startImport(source);
    if(!await accept(source,result))pending.push(source);
  }
  // Uploads stay sequential; earlier assets may transcode while later sources transfer.
  while(pending.length&&!input.shouldStop?.()){
    for(let i=0;i<pending.length&&!input.shouldStop?.();){
      const source=pending[i],count=polls.get(source.assetId)??0;
      if(count>=(input.maxPolls??60))throw new Error(`Source ${source.assetId} needs more processing time; no creation retry was attempted`);
      report(source,'processing');
      if(input.shouldStop?.())break;
      const result=await request('poll',source);polls.set(source.assetId,count+1);
      if(input.retryFailedImports&&result.outcome?.state==='failed'&&result.outcome.sourceId===source.assetId){
        const retried=await retryAfterRecordedFailure(source);
        if(await accept(source,retried))pending.splice(i,1);else i++;
        continue;
      }
      if(await accept(source,result))pending.splice(i,1);else i++;
    }
  }
  return {completed:input.sources.filter(source=>completed.has(source.assetId)).map(source=>source.assetId),stopped:completed.size<input.sources.length};
}
