import type {ArchivedSource} from './archive';
import type {ImportOutcome} from './importer';
import {ImportStoppedError} from './import-failure';

export type MigrationMode='import'|'poll'|'inspect-playback'|'inspect-reservation'|'prepare-recovery'|'import-recovery'|'poll-recovery'|'adopt-recovery'|'prepare-retry'|'retry-import';
export type BatchProgress={completed:number;total:number;sourceId:string;phase:'importing'|'processing'|'checking'|'ready'};
type RequestResult={outcome?:ImportOutcome;diagnostic?:{playableManifest:boolean}};

/** Retry-batch only: poll failed and playback could not confirm readiness; caller may skip this source. */
export class RetryBatchSourceSkippedError extends Error {}
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
  let requested=false;
  const report=(source:ArchivedSource,phase:BatchProgress['phase'])=>input.report({completed:completed.size,total:input.sources.length,sourceId:source.assetId,phase});
  const callRequest=async(mode:MigrationMode,source:ArchivedSource)=>{
    if(requested)await input.wait();
    requested=true;
    return input.request(mode,source);
  };
  const request=async(mode:MigrationMode,source:ArchivedSource)=>{
    // All modes share the admin endpoint's 10/minute limit, including ready resumes.
    // The caller waits ten seconds between requests; never retry uncertain mutations.
    try{return await callRequest(mode,source);}
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
  const startImport=async(source:ArchivedSource)=>{
    if(input.retryFailedImports){
      let polled:RequestResult;
      try{
        polled=await callRequest('poll',source);
      }catch(pollError){
        const playback=await callRequest('inspect-playback',source).catch(()=>null);
        if(playback?.diagnostic?.playableManifest===true){
          return {outcome:{state:'ready' as const,sourceId:source.assetId,action:'unchanged' as const}};
        }
        throw new RetryBatchSourceSkippedError(`Source ${source.assetId} poll failed; skipped without prepare-retry`,pollError instanceof Error?{cause:pollError}:undefined);
      }
      const state=polled.outcome?.state;
      if(state==='ready')return polled;
      if(state==='processing'||state==='importing'){
        return state==='importing'?{outcome:{state:'processing' as const,sourceId:source.assetId,action:'polled' as const}}:polled;
      }
      await request('prepare-retry',source);
      return request('retry-import',source);
    }
    return request('import',source);
  };
  for(const source of input.sources){
    if(input.shouldStop?.())break;
    report(source,'importing');
    try{
      const result=await startImport(source);
      if(!await accept(source,result))pending.push(source);
    }catch(error){
      if(input.retryFailedImports&&error instanceof RetryBatchSourceSkippedError)continue;
      throw error;
    }
  }
  // Uploads stay sequential; earlier assets may transcode while later sources transfer.
  while(pending.length&&!input.shouldStop?.()){
    for(let i=0;i<pending.length&&!input.shouldStop?.();){
      const source=pending[i],count=polls.get(source.assetId)??0;
      if(count>=(input.maxPolls??60))throw new Error(`Source ${source.assetId} needs more processing time; no creation retry was attempted`);
      report(source,'processing');
      if(input.shouldStop?.())break;
      const result=await request('poll',source);polls.set(source.assetId,count+1);
      if(await accept(source,result))pending.splice(i,1);else i++;
    }
  }
  return {completed:input.sources.filter(source=>completed.has(source.assetId)).map(source=>source.assetId),stopped:completed.size<input.sources.length};
}
