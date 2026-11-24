import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const m=vi.hoisted(()=>({auth:vi.fn(),access:vi.fn(),create:vi.fn(),secure:vi.fn(),rpc:vi.fn(),stream:vi.fn()}));
vi.mock('@/lib/payments/payment-response',()=>({withPlatformApiPaymentHeaders:(r:Response)=>r}));
vi.mock('@/lib/middleware/botIdGuard',()=>({requireHumanOrVerifiedBot:async()=>({allowed:true})}));
vi.mock('@/lib/middleware/rateLimit',()=>({rateLimiters:{strict:async()=>null}}));
vi.mock('@/lib/video-provider/config',()=>({resolveVideoProviderId:()=> 'frameworks'}));
vi.mock('@/lib/auth/require-wallet',()=>({requireWalletAuthFor:m.auth,WalletAuthError:class extends Error {constructor(public status:number,message:string){super(message);}}}));
vi.mock('@/lib/utils/metoken-access',()=>({isMeTokenGateActive:(required:boolean)=>required,checkMeTokenAccess:m.access}));
vi.mock('@/lib/utils/linked-identity',()=>({resolveVerifiedViewerAddresses:async(address:string)=>[address]}));
vi.mock('@/services/livepeer-clips',()=>({createClip:m.create}));
vi.mock('@/services/streams',()=>({getStreamByPlaybackId:m.stream}));
vi.mock('@/lib/video-provider/frameworks/clip-policy',()=>({secureFrameworksClip:m.secure}));
vi.mock('@/lib/sdk/supabase/service',()=>({createServiceClient:()=>({rpc:m.rpc})}));
import {WalletAuthError} from '@/lib/auth/require-wallet';
import {POST} from './route';
const owner='0x'+'a'.repeat(40),broadcaster='0x'+'b'.repeat(40);
const request=()=>new NextRequest('https://example.test/api/livepeer/clips',{method:'POST',body:JSON.stringify({playbackId:'parent-play',sessionId:'session',startTime:1000,endTime:11000,clipperAddress:owner})});
beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({address:owner});m.stream.mockResolvedValue({id:'parent-id',playback_id:'parent-play',creator_id:broadcaster,requires_metoken:true,metoken_price:2});m.access.mockResolvedValue({allowed:true});m.create.mockResolvedValue({assetId:'clip',newPlaybackId:'clip-play',playbackUrl:'https://foghorn.frameworks.network/play/clip-play/hls/index.m3u8'});m.secure.mockResolvedValue(undefined);m.rpc.mockResolvedValue({error:null});});
describe('protected clip creation',()=>{
 it('rejects forged wallet proof before creating an upstream clip',async()=>{
  m.auth.mockRejectedValue(new WalletAuthError(403,'Invalid wallet signature'));
  expect((await POST(request())).status).toBe(403);expect(m.create).not.toHaveBeenCalled();
 });
 it('requires the broadcaster gate before allocating provider storage',async()=>{
  m.access.mockResolvedValue({allowed:false});expect((await POST(request())).status).toBe(403);expect(m.create).not.toHaveBeenCalled();
  expect(m.access).toHaveBeenCalledWith(expect.objectContaining({creatorAddress:broadcaster,requiredAmount:2}));
 });
 it('confirms upstream protection before registering server-owned metadata',async()=>{
  expect((await POST(request())).status).toBe(200);
  expect(m.secure).toHaveBeenCalledWith('clip','clip-play');
  expect(m.rpc).toHaveBeenCalledWith('register_frameworks_clip',expect.objectContaining({p_owner:owner,p_expected_creator:broadcaster,p_expected_gate:true,p_expected_price:2,p_parent_playback_id:'parent-play'}));
  expect(m.secure.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[0]);
 });
 it('returns no playback identity or permission when upstream protection fails',async()=>{
  m.secure.mockRejectedValue(new Error('private provider message'));
  const response=await POST(request());expect(response.status).toBe(500);expect(m.rpc).not.toHaveBeenCalled();expect(await response.text()).not.toContain('private provider');
 });
 it('returns the canonical stored parent when creation starts from a historical link',async()=>{
  m.stream.mockResolvedValue({id:'parent-id',playback_id:'canonical-parent',creator_id:broadcaster,requires_metoken:false});
  expect(await (await POST(request())).json()).toMatchObject({parentPlaybackId:'canonical-parent'});
 });
});
