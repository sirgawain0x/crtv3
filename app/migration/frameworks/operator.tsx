'use client';
import {useRef,useState} from 'react';
import {usePlatformAdmin} from '@/lib/hooks/admin/usePlatformAdmin';
import {usePlatformAdminWalletAuth} from '@/lib/hooks/admin/usePlatformAdminWalletAuth';
import {archivedSourcesFromManifests} from '@/lib/video-provider/migration/archive';
import type {ImportOutcome} from '@/lib/video-provider/migration/importer';
import {runVerifiedImportBatch,type MigrationMode} from '@/lib/video-provider/migration/batch';
import type {ArchivedSource} from '@/lib/video-provider/migration/archive';
import {requestMigrationImport} from '@/lib/video-provider/migration/import-request';
export default function MigrationOperator(){
 const {adminAuthAddress,isAdmin}=usePlatformAdmin();
 const {getAuthHeaders,isReady}=usePlatformAdminWalletAuth(adminAuthAddress);const [metadata,setMetadata]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[outcome,setOutcome]=useState<ImportOutcome|null>(null);
 const stopRequested=useRef(false);
 async function request(mode:MigrationMode,source:ArchivedSource){
  return requestMigrationImport({mode,source},{headers:await getAuthHeaders()});
 }
 async function run(mode:MigrationMode){
  setBusy(true);setMessage('');
  try{
   const parsed=JSON.parse(metadata);const sources=archivedSourcesFromManifests([{assets:[{...parsed,status:'archived'}]}]);
   if(sources.length!==1)throw new Error('Paste one source from the verified archive manifest.');
   const result=await request(mode,sources[0]);
   if('message' in result){setMessage(result.message);return;}
   if(mode==='inspect-playback'||mode==='inspect-reservation'){if('diagnostic' in result)setMessage(JSON.stringify(result.diagnostic));return;}
   if('outcome' in result){
    setOutcome(result.outcome);setMessage(result.recovery?(result.outcome.state==='ready'?'Replacement is ready. Adopt verified recovery to reconcile the original mapping.':'Replacement request finished. Poll replacement; never recreate an uncertain attempt.'):(result.outcome.state==='ready'?'Verified import ready.':'Request finished. Poll an existing processing import; do not recreate uncertain imports.'));
   }

  }catch(error){setMessage(error instanceof Error?error.message:'Migration request failed');}finally{setBusy(false);}
 }
 async function runBatch(){
  setBusy(true);setMessage('');setOutcome(null);stopRequested.current=false;
  try{
   const entries=JSON.parse(metadata);if(!Array.isArray(entries))throw new Error('Paste an array of verified archive source records for a batch.');
   const sources=archivedSourcesFromManifests([{assets:entries.map(entry=>({...entry,status:'archived'}))}]);
   const result=await runVerifiedImportBatch({sources,request:async(mode,source)=>{
    const response=await request(mode,source);
    if('outcome' in response)return {outcome:response.outcome};
    if('diagnostic' in response)return {diagnostic:{playableManifest:response.diagnostic.playableManifest===true}};
    throw new Error('error' in response?response.error:'Unexpected migration batch response');
   },shouldStop:()=>stopRequested.current,
    wait:()=>new Promise(resolve=>setTimeout(resolve,10000)),
    report:progress=>setMessage(`${progress.completed}/${progress.total} verified. ${progress.phase}: ${progress.sourceId}`)});
   setMessage(`${result.completed.length}/${sources.length} sources verified.${result.stopped?' Stopped safely between sources.':' Batch complete.'}`);
  }catch(error){setMessage(error instanceof Error?error.message:'Batch stopped. Inspect its reservation before retrying.');}finally{setBusy(false);}
 }
 if(!isAdmin)return <main className="mx-auto max-w-2xl p-8"><h1>Staging video migration</h1><p>Sign in with the platform admin wallet to continue.</p></main>;
 return <main className="mx-auto max-w-2xl space-y-4 p-8"><h1 className="text-2xl font-bold">Staging video migration</h1>
  <p>Import verified archived sources into isolated QA. Existing server credentials stay on the server. This action cannot change production.</p>
  <label htmlFor="archive-source" className="block">Verified archive source metadata</label>
  <textarea id="archive-source" value={metadata} onChange={event=>{setMetadata(event.target.value);setOutcome(null);}} rows={9} className="w-full rounded border bg-background p-3 font-mono text-sm" disabled={busy}/>
  <div className="flex gap-4"><button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('import')}>Import verified source</button>
  <button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('poll')}>Poll existing import</button></div>
  <button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('inspect-playback')}>Check playback manifest</button>
  <button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('inspect-reservation')}>Inspect import reservation</button>
  <button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={runBatch}>Import verified batch</button>
  <details className="space-y-3 rounded border p-4"><summary>Reviewed unfinished-upload recovery</summary>
   <p>Only the specifically reviewed pre-transfer failure is eligible. Preserve its protected original artifact and audit; upload a separate replacement, verify it, then adopt its mapping. No original upload is retried or deleted.</p>
   <button disabled={busy||!isReady||!metadata} onClick={()=>run('prepare-recovery')}>Prepare reviewed recovery</button>{' '}
   <button disabled={busy||!isReady||!metadata} onClick={()=>run('import-recovery')}>Import reserved replacement</button>{' '}
   <button disabled={busy||!isReady||!metadata} onClick={()=>run('poll-recovery')}>Poll replacement</button>{' '}
   <button disabled={busy||!isReady||!metadata} onClick={()=>run('adopt-recovery')}>Adopt verified recovery</button>
  </details>
  {busy&&<><button className="rounded border px-4 py-2" onClick={()=>{stopRequested.current=true;}}>Stop after current source</button><p role="status">Verifying sources. Keep this page open; completed reservations are reused when resuming.</p></>}
  {message&&<p role="status">{message}</p>}{outcome&&<p>State: <strong>{outcome.state}</strong></p>}
 </main>;
}
