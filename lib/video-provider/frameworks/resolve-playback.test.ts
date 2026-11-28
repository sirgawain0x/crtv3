import {expect,it,vi} from 'vitest';
import {resolveAuthorizedFrameworksHlsUrl} from './resolve-playback';

it('carries the authorized token to an edge when Foghorn drops it and retains the session',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:307,headers:{location:'https://edge-us-1.media-us-1.frameworks.network/hls/vod/index.m3u8?tkn=provider-session'}}));
 const result=new URL(await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher));
 expect(result.searchParams.get('fwjwt')).toBe('PRIVATE');expect(result.searchParams.get('tkn')).toBe('provider-session');
 expect(result.searchParams.has('jwt')).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each(['https://attacker.example/hls/index.m3u8','https://frameworks.network.attacker.example/index.m3u8','http://edge.frameworks.network/index.m3u8','https://user:password@edge.frameworks.network/index.m3u8','https://edge.frameworks.network:8443/index.m3u8','https://edge.frameworks.network/graphql'])('rejects unreviewed media destination %s without sending it a credential',async location=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:307,headers:{location}}));
 await expect(resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher)).rejects.toThrow('Unreviewed');expect(fetcher).toHaveBeenCalledTimes(1);
});
it('fails closed on routing denial and does not disclose provider errors',async()=>{
 const fetcher=vi.fn(async()=>new Response('PRIVATE',{status:403}));
 await expect(resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher)).rejects.toThrow('FrameWorks playback routing unavailable');
 const broken=vi.fn(async()=>{throw new Error('https://provider/?jwt=PRIVATE');});
 await expect(resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',broken)).rejects.toThrow('FrameWorks playback routing unavailable');
});
it('rejects missing authorization and sanitizes malformed credential-bearing redirects',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:307,headers:{location:'https://[invalid?jwt=PRIVATE'}}));
 await expect(resolveAuthorizedFrameworksHlsUrl('verified','',fetcher)).rejects.toThrow('authorization unavailable');
 expect(fetcher).not.toHaveBeenCalled();
 try{await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher);throw new Error('Expected rejection');}
 catch(error){expect(String(error)).toBe('Error: Unreviewed FrameWorks playback destination');expect(JSON.stringify(error)).not.toContain('PRIVATE');}
});

it('does not fetch a cross-host destination unless the probe is enabled',async()=>{
 const fetcher=vi.fn(async()=>new Response(null,{status:307,headers:{location:'https://edge-us-1.media-us-1.frameworks.network/hls/vod/index.m3u8?tkn=provider-session'}}));
 await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher);
 expect(fetcher).toHaveBeenCalledTimes(1);
});

it('probes a cross-host destination when enabled and reports only status and payload kind',async()=>{
 const responses=[
  new Response(null,{status:307,headers:{location:'https://edge-us-1.media-us-1.frameworks.network/hls/vod/index.m3u8?tkn=provider-session'}}),
  new Response('#EXTM3U',{status:200,headers:{'content-type':'application/vnd.apple.mpegurl'}}),
 ];
 const fetcher=vi.fn(async()=>responses.shift()!);
 const logger={warn:vi.fn()};
 const url=await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher,
  {verifyDestination:true,logger,origin:'https://staging.tv.creativeplatform.xyz'});
 expect(fetcher).toHaveBeenCalledTimes(2);
 expect(new URL(url).searchParams.get('fwjwt')).toBe('PRIVATE');
 expect(logger.warn).toHaveBeenCalledWith('[frameworks playback] cross-host destination probed',
  {status:200,servedMpegurl:true,redirectedAgain:false,
   acaoPresent:false,acaoWildcard:false,acaoMatchesOrigin:false});
 // the probe must ask as the browser would
 expect((fetcher.mock.calls[1][1] as RequestInit).headers).toMatchObject({Origin:'https://staging.tv.creativeplatform.xyz'});
 expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('PRIVATE');
});

it('still returns the URL when the probed destination is refused, and records that it was refused',async()=>{
 const responses=[
  new Response(null,{status:307,headers:{location:'https://edge-us-1.media-us-1.frameworks.network/hls/vod/index.m3u8?tkn=provider-session'}}),
  new Response('denied',{status:403}),
 ];
 const fetcher=vi.fn(async()=>responses.shift()!);
 const logger={warn:vi.fn()};
 const url=await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher,{verifyDestination:true,logger});
 expect(new URL(url).searchParams.get('fwjwt')).toBe('PRIVATE');
 expect(logger.warn).toHaveBeenCalledWith('[frameworks playback] cross-host destination probed',
  {status:403,servedMpegurl:false,redirectedAgain:false,
   acaoPresent:false,acaoWildcard:false,acaoMatchesOrigin:false});
});

it('records a failed probe without changing the returned URL',async()=>{
 let call=0;
 const fetcher=vi.fn(async()=>{
  call+=1;
  if(call===1)return new Response(null,{status:307,headers:{location:'https://edge-us-1.media-us-1.frameworks.network/hls/vod/index.m3u8?tkn=provider-session'}});
  throw new Error('network down');
 });
 const logger={warn:vi.fn()};
 const url=await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher,{verifyDestination:true,logger});
 expect(new URL(url).searchParams.get('fwjwt')).toBe('PRIVATE');
 expect(logger.warn).toHaveBeenCalledWith('[frameworks playback] cross-host destination probe failed',{reason:'fetch_failed'});
});

it('reports the CORS answer for the requesting origin without logging the header value',async()=>{
 const origin='https://staging.tv.creativeplatform.xyz';
 const responses=[
  new Response(null,{status:307,headers:{location:'https://edge-us-1.media-us-1.frameworks.network/hls/vod/index.m3u8?tkn=provider-session'}}),
  new Response('#EXTM3U',{status:200,headers:{'content-type':'application/vnd.apple.mpegurl','access-control-allow-origin':origin}}),
 ];
 const fetcher=vi.fn(async()=>responses.shift()!);
 const logger={warn:vi.fn()};
 await resolveAuthorizedFrameworksHlsUrl('verified','PRIVATE',fetcher,{verifyDestination:true,logger,origin});
 const [,context]=logger.warn.mock.calls.at(-1)!;
 expect(context).toMatchObject({acaoPresent:true,acaoWildcard:false,acaoMatchesOrigin:true});
 expect(JSON.stringify(context)).not.toContain(origin);
});
