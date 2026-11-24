import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const m=vi.hoisted(()=>({auth:vi.fn(),one:vi.fn(),create:vi.fn(),from:vi.fn(),alias:vi.fn(),eq:vi.fn()}));
vi.mock('@/lib/video-provider/frameworks/playback-alias',()=>({resolveFrameworksPlaybackAlias:m.alias}));
vi.mock('@/lib/middleware/botIdGuard',()=>({checkBotIdDeep:async()=>({isBot:false})}));
vi.mock('@/lib/middleware/rateLimit',()=>({rateLimiters:{strict:async()=>null}}));
vi.mock('@/lib/video-provider/config',()=>({resolveVideoProviderId:()=> 'frameworks'}));
vi.mock('@/lib/auth/require-wallet',()=>({requireWalletAuthFor:m.auth,WalletAuthError:class extends Error {constructor(public status:number,message:string){super(message);}}}));
vi.mock('@/services/video-assets',()=>({createClipVideoAsset:m.create}));
vi.mock('@/services/livepeer-clips',()=>({getClipThumbnailUrl:vi.fn()}));
vi.mock('@/services/streams',()=>({getStreamByPlaybackId:vi.fn()}));
vi.mock('@/lib/sdk/supabase/service',()=>({createServiceClient:()=>({from:m.from})}));
import {WalletAuthError} from '@/lib/auth/require-wallet';
import {POST} from './route';
const owner='0x'+'a'.repeat(40);
const request=()=>new NextRequest('https://example.test/api/video-assets/clips',{method:'POST',body:JSON.stringify({assetId:'clip',playbackId:'clip-play',parentPlaybackId:'parent-play',clipStartMs:1,clipEndMs:2,clipperAddress:owner,parentStoryIpId:'forged-ip'})});
beforeEach(()=>{vi.clearAllMocks();m.auth.mockResolvedValue({address:owner});m.alias.mockImplementation(async id=>id);const chain={select:()=>chain,eq:m.eq,maybeSingle:m.one};m.eq.mockReturnValue(chain);m.from.mockReturnValue(chain);m.one.mockResolvedValueOnce({data:{asset_id:'clip',playback_id:'clip-play',creator_id:owner,parent_stream_id:'source'},error:null}).mockResolvedValueOnce({data:{id:7,parent_story_ip_id:'stored-parent-ip'},error:null});});
describe('protected clip catalog confirmation',()=>{
 it('requires wallet proof before reading protected ownership',async()=>{
  m.auth.mockRejectedValue(new WalletAuthError(403,'Invalid wallet proof'));expect((await POST(request())).status).toBe(403);expect(m.from).not.toHaveBeenCalled();
 });
 it('rejects a client claim without an existing matching private authority',async()=>{
  m.one.mockReset().mockResolvedValue({data:{creator_id:'someone-else',playback_id:'clip-play',parent_stream_id:'source'},error:null});
  expect((await POST(request())).status).toBe(404);expect(m.create).not.toHaveBeenCalled();
 });
 it('returns server-created metadata and never persists forged Story parent data',async()=>{
  const response=await POST(request());expect(response.status).toBe(200);expect(await response.json()).toEqual({clip:{id:7,parent_story_ip_id:'stored-parent-ip'}});expect(m.create).not.toHaveBeenCalled();expect(response.headers.get('cache-control')).toBe('private, no-store');
 });
 it('resolves an old parent link before confirming the canonical clip catalog row',async()=>{
  m.alias.mockResolvedValue('canonical-parent');expect((await POST(request())).status).toBe(200);expect(m.eq).toHaveBeenCalledWith('parent_playback_id','canonical-parent');
 });
});
