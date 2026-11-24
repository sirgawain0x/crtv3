import {createHmac} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const spies=vi.hoisted(()=>({asset:vi.fn(),finalize:vi.fn(),persist:vi.fn(),live:vi.fn(),offline:vi.fn(),legacy:vi.fn()}));
vi.mock('@/lib/livepeer/studio-api',()=>({getLivepeerAsset:spies.asset}));
vi.mock('@/services/livestream-recordings',()=>({finalizeStreamRecordings:spies.finalize,persistRecordingAsset:spies.persist}));
vi.mock('@/services/streams',()=>({markStreamLiveByStreamId:spies.live,markStreamOfflineByStreamId:spies.offline}));
vi.mock('@/lib/livepeer/verify-webhook',()=>({verifyLivepeerWebhookSignature:spies.legacy}));
import {POST} from './route';
const secret=Buffer.from('ephemeral-integration-key');
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VIDEO_PROVIDER','livepeer');vi.stubEnv('FRAMEWORKS_WEBHOOK_SECRET','whsec_'+secret.toString('base64'));vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET','PRIVATE_BYPASS');spies.legacy.mockReturnValue(true);});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function request(body:string){const id='event',ts=String(Math.floor(Date.now()/1000));return new NextRequest('https://tv.creativeplatform.xyz/api/livepeer/webhook',{method:'POST',body,headers:{'webhook-id':id,'webhook-timestamp':ts,'webhook-signature':'v1,'+createHmac('sha256',secret).update(`${id}.${ts}.${body}`).digest('base64')}});}
it('routes actual signed FrameWorks events to QA before any production provider or database handler',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:204}));vi.stubGlobal('fetch',fetcher);
 const response=await POST(request(JSON.stringify({id:'event',type:'stream.live',data:{streamId:'qa-only'}})));
 expect(response.status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1);
 for(const spy of Object.values(spies))expect(spy).not.toHaveBeenCalled();
});
it('does not acknowledge a failed QA delivery or expose its details',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('PRIVATE',{status:500})));
 const response=await POST(request(JSON.stringify({id:'event',type:'webhook.test'})));
 expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE');expect(spies.legacy).not.toHaveBeenCalled();
});
it('retains the existing signed legacy event behavior until provider cutover',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const response=await POST(new NextRequest('https://tv.creativeplatform.xyz/api/livepeer/webhook',{method:'POST',body:JSON.stringify({event:'stream.started',streamId:'existing'}),headers:{'Livepeer-Signature':'test'}}));
 expect(response.status).toBe(200);expect(spies.live).toHaveBeenCalledWith('existing');expect(fetcher).not.toHaveBeenCalled();
});
