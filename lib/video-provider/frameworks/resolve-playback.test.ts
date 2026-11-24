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
