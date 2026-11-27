import {frameworksPlayHlsUrl} from './constants';

type ProbeLogger={warn:(message:string,context?:Record<string,unknown>)=>void};

/**
 * Resolve only after app authorization; retain the scoped credential across Foghorn redirects.
 *
 * A cross-host redirect is returned without the server fetching it - validating a URL is not
 * validating the resource behind it - so a 200 from the caller does not prove the browser can load
 * the manifest. With `verifyDestination` set, that destination is probed once and only its status
 * and whether it served an mpegurl body are logged. Behaviour is otherwise unchanged: the URL is
 * still returned, because the probe is evidence, not a new gate.
 */
export async function resolveAuthorizedFrameworksHlsUrl(playbackId:string,token:string,fetcher:typeof fetch=fetch,
 options?:{verifyDestination?:boolean;logger?:ProbeLogger}):Promise<string>{
  if(!playbackId.trim()||!token.trim())throw new Error('FrameWorks playback authorization unavailable');
  const initial=new URL(frameworksPlayHlsUrl(playbackId));
  initial.searchParams.set('jwt',token);
  let current=initial;
  for(let i=0;i<3;i++){
    let response:Response;
    try{response=await fetcher(current,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.apple.mpegurl'}});}
    catch{throw new Error('FrameWorks playback routing unavailable');}
    const location=response.headers.get('location');
    await response.body?.cancel().catch(()=>{});
    if([301,302,303,307,308].includes(response.status)&&location){
      let next:URL;
      try{next=new URL(location,current);}catch{throw new Error('Unreviewed FrameWorks playback destination');}
      if(next.protocol!=='https:'||!next.hostname.endsWith('.frameworks.network')||next.username||next.password||next.hash||(next.port&&next.port!=='443')||!next.pathname.endsWith('.m3u8')){
        throw new Error('Unreviewed FrameWorks playback destination');
      }
      if(next.hostname!==initial.hostname){
        // fwjwt is the provider's viewer credential; tkn remains its playback session.
        next.searchParams.set('fwjwt',token);
        if(options?.verifyDestination){
          // Server-side reachability only: a browser may still be refused by CORS.
          try{
            const probe=await fetcher(next,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.apple.mpegurl'}});
            const contentType=(probe.headers.get('content-type')??'').toLowerCase();
            await probe.body?.cancel().catch(()=>{});
            options.logger?.warn('[frameworks playback] cross-host destination probed',{
              status:probe.status,
              servedMpegurl:contentType.includes('mpegurl'),
              redirectedAgain:[301,302,303,307,308].includes(probe.status),
            });
          }catch{
            options.logger?.warn('[frameworks playback] cross-host destination probe failed',{reason:'fetch_failed'});
          }
        }
        return next.toString();
      }
      next.searchParams.set('jwt',token);current=next;continue;
    }
    if(response.ok&&(response.headers.get('content-type')??'').toLowerCase().includes('mpegurl'))return current.toString();
    throw new Error('FrameWorks playback routing unavailable');
  }
  throw new Error('FrameWorks playback routing unavailable');
}
