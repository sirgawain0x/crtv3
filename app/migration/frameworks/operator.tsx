'use client';
import {useState} from 'react';
import {usePlatformAdmin} from '@/lib/hooks/admin/usePlatformAdmin';
import {usePlatformAdminWalletAuth} from '@/lib/hooks/admin/usePlatformAdminWalletAuth';
import {archivedSourcesFromManifests} from '@/lib/video-provider/migration/archive';
import type {ImportOutcome} from '@/lib/video-provider/migration/importer';
export default function MigrationOperator(){
 const {adminAuthAddress,isAdmin}=usePlatformAdmin();
 const {getAuthHeaders,isReady}=usePlatformAdminWalletAuth(adminAuthAddress);const [metadata,setMetadata]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[outcome,setOutcome]=useState<ImportOutcome|null>(null);
 async function run(mode:'import'|'poll'|'inspect-playback'){
  setBusy(true);setMessage('');
  try{
   const parsed=JSON.parse(metadata);const sources=archivedSourcesFromManifests([{assets:[{...parsed,status:'archived'}]}]);
   if(sources.length!==1)throw new Error('Paste one source from the verified archive manifest.');
   const response=await fetch('/api/migration/frameworks/import',{method:'POST',headers:{'Content-Type':'application/json',...await getAuthHeaders()},body:JSON.stringify({mode,source:sources[0]})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Migration request failed');
   if(mode==='inspect-playback'){setMessage(JSON.stringify(result.diagnostic));return;}
   setOutcome(result.outcome);setMessage(result.outcome.state==='ready'?'Verified import ready.':'Request finished. Poll an existing processing import; do not recreate uncertain imports.');
  }catch(error){setMessage(error instanceof Error?error.message:'Migration request failed');}finally{setBusy(false);}
 }
 if(!isAdmin)return <main className="mx-auto max-w-2xl p-8"><h1>Staging video migration</h1><p>Sign in with the platform admin wallet to continue.</p></main>;
 return <main className="mx-auto max-w-2xl space-y-4 p-8"><h1 className="text-2xl font-bold">Staging video migration</h1>
  <p>Import one archived source into isolated QA. Existing server credentials stay on the server. This action cannot change production.</p>
  <label htmlFor="archive-source" className="block">Verified archive source metadata</label>
  <textarea id="archive-source" value={metadata} onChange={event=>{setMetadata(event.target.value);setOutcome(null);}} rows={9} className="w-full rounded border bg-background p-3 font-mono text-sm" disabled={busy}/>
  <div className="flex gap-4"><button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('import')}>Import verified source</button>
  <button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('poll')}>Poll existing import</button></div>
  <button className="rounded border px-4 py-2" disabled={busy||!isReady||!metadata} onClick={()=>run('inspect-playback')}>Check playback manifest</button>
  {busy&&<p role="status">Verifying and transferring one source. Keep this page open.</p>}
  {message&&<p role="status">{message}</p>}{outcome&&<p>State: <strong>{outcome.state}</strong></p>}
 </main>;
}
