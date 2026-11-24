import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const {auth,run,remote,client,find,inspect,reservation}=vi.hoisted(()=>({auth:vi.fn(),run:vi.fn(),remote:vi.fn(),client:vi.fn(),find:vi.fn(),inspect:vi.fn(),reservation:vi.fn()}));
vi.mock('@/lib/access/require-platform-admin',()=>({requirePlatformAdmin:auth,PlatformAdminAuthError:class extends Error{constructor(public status:number,message:string){super(message);}}}));
vi.mock('@/lib/middleware/rateLimit',()=>({rateLimiters:{standard:vi.fn(async()=>null)}}));
vi.mock('@/lib/sdk/supabase/service',()=>({createServiceClient:client}));
vi.mock('@/lib/video-provider/migration/importer',()=>({runAssetImport:run}));
vi.mock('@/lib/video-provider/migration/studio-source',()=>({createStudioImportSource:remote}));
vi.mock('@/lib/video-provider/migration/supabase-ledger',()=>({createImportLedger:()=>({find})}));
vi.mock('@/lib/video-provider/migration/inspect-playback',()=>({inspectMigrationPlayback:inspect}));
vi.mock('@/lib/video-provider/migration/inspect-reservation',()=>({inspectMigrationReservation:reservation}));
vi.mock('@/lib/video-provider/migration/frameworks-import-provider',()=>({createFrameworksImportProvider:()=>({})}));
import {PlatformAdminAuthError} from '@/lib/access/require-platform-admin';
import {POST} from './route';
import {ImportStoppedError} from '@/lib/video-provider/migration/import-failure';
const source={assetId:'2499b6b6-314f-4251-b119-fbb6445a48a5',playbackId:'old-play',sizeBytes:5,sha256:'a'.repeat(64)};
const request=(body:unknown)=>new NextRequest('https://staging.example/api/migration/frameworks/import',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('VIDEO_PROVIDER','frameworks');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://zxpobpucayevlrzdxhmr.supabase.co');auth.mockResolvedValue({address:'admin'});run.mockResolvedValue({sourceId:source.assetId,state:'processing',action:'created'});remote.mockReturnValue({verify:()=>{},read:()=>{}});});afterEach(()=>vi.unstubAllEnvs());
describe('isolated admin import boundary',()=>{
 it('returns a fixed protected-upload failure classification while preserving reconciliation guidance',async()=>{
  run.mockRejectedValueOnce(new ImportStoppedError('policy-unconfirmed'));const response=await POST(request({mode:'import',source}));
  expect(response.status).toBe(409);expect((await response.json()).error).toContain('policy-unconfirmed');
 });
 it('inspects an uncertain reservation only when every source proof matches, without creating or fetching original bytes',async()=>{
  find.mockResolvedValue({state:'ambiguous',livepeer_playback_id:source.playbackId,source_sha256:source.sha256,source_bytes:source.sizeBytes});
  reservation.mockResolvedValue({providerAvailable:true,matchingArtifacts:[]});
  expect((await POST(request({mode:'inspect-reservation',source}))).status).toBe(200);expect(reservation).toHaveBeenCalledWith(source);expect(run).not.toHaveBeenCalled();expect(remote).not.toHaveBeenCalled();
  find.mockResolvedValue({state:'ambiguous',source_sha256:'different'});
  expect((await POST(request({mode:'inspect-reservation',source}))).status).toBe(409);expect(reservation).toHaveBeenCalledTimes(1);
 });
 it('inspects only the exact ready reservation without fetching originals or creating another upload',async()=>{
  find.mockResolvedValue({state:'ready',livepeer_playback_id:source.playbackId,source_sha256:source.sha256,source_bytes:source.sizeBytes,frameworks_playback_id:'verified-target',frameworks_asset_id:'verified-artifact'});
  inspect.mockResolvedValue({playableManifest:false,hops:[{status:403,code:'PLAYBACK_ACCESS_DENIED'}]});
  const response=await POST(request({mode:'inspect-playback',source}));expect(response.status).toBe(200);expect(inspect).toHaveBeenCalledWith('verified-target',expect.any(Function),'verified-artifact');expect(remote).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
  find.mockResolvedValue({state:'ready',livepeer_playback_id:'different-source'});expect((await POST(request({mode:'inspect-playback',source}))).status).toBe(409);expect(inspect).toHaveBeenCalledTimes(1);
 });
 it.each([['VERCEL_ENV','production'],['NEXT_PUBLIC_SUPABASE_URL','https://zdeiezfoemibjgrkyzvs.supabase.co'],['VIDEO_PROVIDER','livepeer']])('denies the wrong %s before authorization or provider work',async(name,value)=>{
  vi.stubEnv(name,value);expect((await POST(request({mode:'import',source}))).status).toBe(404);expect(auth).not.toHaveBeenCalled();expect(run).not.toHaveBeenCalled();
 });
 it('requires the signed platform admin wallet before reading or creating an import',async()=>{
  auth.mockRejectedValueOnce(new PlatformAdminAuthError(403,'Platform admin wallet required'));
  expect((await POST(request({mode:'import',source}))).status).toBe(403);expect(client).not.toHaveBeenCalled();expect(remote).not.toHaveBeenCalled();
 });
 it('uses server-side credentials and excludes client-provided URLs or owners',async()=>{
  const response=await POST(request({mode:'import',source:{...source,url:'https://attacker.example',creator:'attacker'}}));expect(response.status).toBe(200);expect(run).toHaveBeenCalledWith(expect.objectContaining({source}));
  expect(JSON.stringify(await response.json())).not.toContain('private');expect(response.headers.get('cache-control')).toBe('private, no-store');
 });
 it('polls without fetching source data and masks provider errors',async()=>{
  expect((await POST(request({mode:'poll',source}))).status).toBe(200);expect(remote).not.toHaveBeenCalled();expect(run).toHaveBeenCalledWith(expect.objectContaining({file:undefined}));
  run.mockRejectedValueOnce(new Error('https://private.example/?secret=KEY'));const response=await POST(request({mode:'poll',source}));expect(response.status).toBe(409);expect(JSON.stringify(await response.json())).not.toContain('KEY');
 });
 it('rejects malformed evidence and oversized sources before provider work',async()=>{
  expect((await POST(request({mode:'import',source:{...source,sha256:'bad'}}))).status).toBe(400);
  expect((await POST(request({mode:'import',source:{...source,sizeBytes:2*1024**3}}))).status).toBe(400);expect(run).not.toHaveBeenCalled();
 });
});
