import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@livepeer/react/external',()=>({getSrc:(info:unknown)=>info}));
vi.mock('@/lib/utils/logger',()=>({logger:{debug:vi.fn(),info:vi.fn(),warn:vi.fn(),error:vi.fn()}}));
import {getDetailPlaybackSource,PlaybackAuthorizationError} from './useDetailPlaybackSources';
afterEach(()=>vi.unstubAllGlobals());
describe('protected playback source requests',()=>{
 it('forwards proof and the linked-wallet candidate to source authorization',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify([{src:'signed-media'}]),{status:200}));vi.stubGlobal('fetch',fetcher);
  await getDetailPlaybackSource('video-id',{authHeaders:{'X-Wallet-Signature':'proof'},companionAddress:'0xlinked'});
  expect(fetcher).toHaveBeenCalledWith('/api/internal/playback-info?playbackId=video-id&companionAddress=0xlinked',expect.objectContaining({headers:expect.objectContaining({'X-Wallet-Signature':'proof'})}));
 });
 it('retains proof and companion identity if a legacy deployment needs the public route',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('{}',{status:404})).mockResolvedValueOnce(new Response('[]',{status:200}));vi.stubGlobal('fetch',fetcher);
  await getDetailPlaybackSource('video-id',{authHeaders:{'X-Wallet-Signature':'proof'},companionAddress:'0xlinked'});
  expect(fetcher.mock.calls[1]).toEqual(['/api/livepeer/playback-info?playbackId=video-id&companionAddress=0xlinked',expect.objectContaining({headers:expect.objectContaining({'X-Wallet-Signature':'proof'})})]);
 });
 it('does not retry a protected denial through an alternate endpoint',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({code:'METOKEN_REQUIRED'}),{status:403}));vi.stubGlobal('fetch',fetcher);
  await expect(getDetailPlaybackSource('protected-video')).rejects.toBeInstanceOf(PlaybackAuthorizationError);expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
