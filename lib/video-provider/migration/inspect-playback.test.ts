import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('../frameworks/playback-signing',()=>({buildAuthorizedViewerPlayHlsUrl:()=> 'https://foghorn.frameworks.network/play/verified/hls/index.m3u8?jwt=PRIVATE'}));
import {inspectMigrationPlayback} from './inspect-playback';
afterEach(()=>vi.restoreAllMocks());
describe('safe staged playback diagnostics',()=>{
 it('checks legacy edge credential transport without changing policy or exposing tokens',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:307,headers:{location:'https://edge.frameworks.network/hls/video/index.m3u8?tkn=session'}}))
   .mockResolvedValueOnce(new Response('#EXTM3U\n#EXT-X-ERROR: Not allowed to play (CONN_PLAY)\n#EXT-X-ENDLIST'))
   .mockResolvedValueOnce(new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nmedia.m3u8'));
  const result=await inspectMigrationPlayback('verified',fetcher);
  expect(result.playableManifest).toBe(true);expect(result.hops[1].credentialParameters).toEqual(['tkn']);
  expect(result.hops[2].alternateTransport).toBe(true);
  const retry=fetcher.mock.calls[2][0] as URL;
  expect(retry.searchParams.get('fwjwt')).toBe('PRIVATE');expect(retry.searchParams.get('jwt')).toBe('PRIVATE');
  expect(JSON.stringify(result)).not.toContain('PRIVATE');
 });
 it('follows reviewed redirects, verifies an actual manifest and excludes bearer URLs',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:307,headers:{location:'https://edge.frameworks.network/hls/video/index.m3u8?fwjwt=PRIVATE'}})).mockResolvedValueOnce(new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nmedia.m3u8',{headers:{'content-type':'application/vnd.apple.mpegurl'}}));
  const result=await inspectMigrationPlayback('verified',fetcher);expect(result.playableManifest).toBe(true);expect(result.hops).toHaveLength(2);expect(JSON.stringify(result)).not.toContain('PRIVATE');
 });
 it('rejects a 200 HLS error playlist and returns only a classified failure',async()=>{
  const fetcher=vi.fn(async()=>new Response('#EXTM3U\n#EXT-X-ERROR: Stream open failed (PRIVATE)\n#EXT-X-ENDLIST',{headers:{'content-type':'application/vnd.apple.mpegurl'}}));
  const result=await inspectMigrationPlayback('verified',fetcher);expect(result.playableManifest).toBe(false);expect(result.hops[0].code).toBe('STREAM_OPEN_FAILED');expect(JSON.stringify(result)).not.toContain('PRIVATE');
 });
 it('returns a safe provider code without exposing response messages or URLs',async()=>{
  const fetcher=vi.fn(async()=>Response.json({code:'PLAYBACK_ACCESS_DENIED',message:'secret-url?jwt=PRIVATE'},{status:403}));
  const result=await inspectMigrationPlayback('verified',fetcher);expect(result.hops[0].code).toBe('PLAYBACK_ACCESS_DENIED');expect(result.playableManifest).toBe(false);expect(JSON.stringify(result)).not.toContain('PRIVATE');
 });
 it('does not mistake a JSON resolver response for a playable manifest',async()=>{
  const fetcher=vi.fn(async()=>Response.json({primary:{url:'private'}}));expect((await inspectMigrationPlayback('verified',fetcher)).playableManifest).toBe(false);
 });
 it('rejects an unreviewed redirect destination before sending it any credential',async()=>{
  const fetcher=vi.fn(async()=>new Response(null,{status:307,headers:{location:'https://attacker.example/hls?jwt=PRIVATE'}}));await expect(inspectMigrationPlayback('verified',fetcher)).rejects.toThrow('Unreviewed');expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
