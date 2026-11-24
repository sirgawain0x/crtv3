import type {ArchivedSource} from './archive';
import type {ImportOutcome} from './importer';

export type MigrationMode='import'|'poll'|'inspect-playback';
export type BatchProgress={completed:number;total:number;sourceId:string;phase:'importing'|'processing'|'checking'|'ready'};
type RequestResult={outcome?:ImportOutcome;diagnostic?:{playableManifest:boolean}};
/** Client orchestration only: every operation retains the existing signed-admin server boundary. */
export async function runVerifiedImportBatch(input:{
  sources:ArchivedSource[];
  request:(mode:MigrationMode,source:ArchivedSource)=>Promise<RequestResult>;
  report:(progress:BatchProgress)=>void;
  wait:()=>Promise<void>;
  shouldStop?:()=>boolean;
  maxPolls?:number;
}){
  if(!input.sources.length||input.sources.length>45)throw new Error('A verified batch must contain between 1 and 45 sources');
  const completed=new Set<string>();
  const pending:ArchivedSource[]=[];
  const polls=new Map<string,number>();
  const report=(source:ArchivedSource,phase:BatchProgress['phase'])=>input.report({completed:completed.size,total:input.sources.length,sourceId:source.assetId,phase});
  const request=async(mode:MigrationMode,source:ArchivedSource)=>{
    try{return await input.request(mode,source);}
    catch{throw new Error(`Batch stopped at source ${source.assetId}; inspect its reservation before resuming`);}
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
  for(const source of input.sources){
    if(input.shouldStop?.())break;
    report(source,'importing');
    const result=await request('import',source);
    if(!await accept(source,result))pending.push(source);
  }
  // Uploads stay sequential; earlier assets may transcode while later sources transfer.
  while(pending.length&&!input.shouldStop?.()){
    for(let i=0;i<pending.length&&!input.shouldStop?.();){
      const source=pending[i],count=polls.get(source.assetId)??0;
      if(count>=(input.maxPolls??60))throw new Error(`Source ${source.assetId} needs more processing time; no creation retry was attempted`);
      report(source,'processing');await input.wait();
      if(input.shouldStop?.())break;
      const result=await request('poll',source);polls.set(source.assetId,count+1);
      if(await accept(source,result))pending.splice(i,1);else i++;
    }
  }
  return {completed:input.sources.filter(source=>completed.has(source.assetId)).map(source=>source.assetId),stopped:completed.size<input.sources.length};
}
