import {NextRequest,NextResponse} from 'next/server';
import {requirePlatformAdmin,PlatformAdminAuthError} from '@/lib/access/require-platform-admin';
import {createServiceClient} from '@/lib/sdk/supabase/service';
import {archivedSourcesFromManifests} from '@/lib/video-provider/migration/archive';
import {runAssetImport} from '@/lib/video-provider/migration/importer';
import {createImportLedger} from '@/lib/video-provider/migration/supabase-ledger';
import {createFrameworksImportProvider} from '@/lib/video-provider/migration/frameworks-import-provider';
import {createStudioImportSource} from '@/lib/video-provider/migration/studio-source';
import {isFrameworksMigrationStaging} from '@/lib/video-provider/migration/staging-runtime';
import {rateLimiters} from '@/lib/middleware/rateLimit';
export const runtime='nodejs';
export const maxDuration=300;
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:NextRequest){
 if(!isFrameworksMigrationStaging())return respond({error:'Not found'},404);
 try{await requirePlatformAdmin(request);}catch(error){if(error instanceof PlatformAdminAuthError)return respond({error:error.message},error.status);return respond({error:'Admin authorization unavailable'},503);}
 const limited=await rateLimiters.standard(request);if(limited)return limited;
 let source,mode;
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>4096)return respond({error:'Source request too large'},413);
  const body=JSON.parse(raw);mode=body.mode;
  if(!['import','poll'].includes(mode)||!body.source||typeof body.source!=='object')throw new Error();
  [source]=archivedSourcesFromManifests([{assets:[{...body.source,status:'archived'}]}]);
  if(!source || source.sizeBytes>1024**3)throw new Error();
 }catch{return respond({error:'One verified source up to 1 GiB is required'},400);}
 try{
  const outcome=await runAssetImport({source,ledger:createImportLedger(createServiceClient()),provider:createFrameworksImportProvider(),
   file:mode==='import'?createStudioImportSource():undefined});
  return respond({outcome});
 }catch{
  // A timeout can leave a reservation. Do not return provider errors, URLs or credentials, or retry creation automatically.
  return respond({error:'Import stopped. Inspect its reservation before retrying; use Poll for an existing processing import.'},409);
 }
}
