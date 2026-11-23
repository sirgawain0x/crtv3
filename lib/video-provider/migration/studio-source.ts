import {createHash} from 'node:crypto';
import {fetchStudioAssetDownloadTarget} from '@/lib/livepeer/vod-migration/studio-asset-download';
import {resolveLivepeerStudioAuthToken} from '@/lib/sdk/livepeer/studioAuth';
import type {ArchivedSource} from './archive';
import type {VerifiedImportSource} from './importer';
const SOURCE_HOST='vod-cdn.lp-playback.studio';
const HASH_CHUNK_BYTES=16*1024*1024;
/** Full checksum verification and bounded range reads from Studio's official CDN. URLs never leave the server. */
export function createStudioImportSource(fetchImpl:typeof fetch=fetch,deadline=Date.now()+240_000):VerifiedImportSource {
 let url:string|undefined,totalBytes=0,etag:string|null=null;
 const signal=()=>{const remaining=deadline-Date.now();if(remaining<=0)throw new Error('Source transfer deadline exceeded');return AbortSignal.timeout(Math.min(30_000,remaining));};
 const read=async(offset:number,length:number):Promise<Uint8Array>=>{
  if(!url || !Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<=0||length>128*1024*1024||offset+length>totalBytes)throw new Error('Invalid source range');
  const response=await fetchImpl(url,{headers:{Range:`bytes=${offset}-${offset+length-1}`,...(etag?.startsWith('"')?{'If-Match':etag}:{})},
   redirect:'error',cache:'no-store',signal:signal()});
  if(response.status!==206 || response.headers.get('content-range')!==`bytes ${offset}-${offset+length-1}/${totalBytes}` || !response.body){await response.body?.cancel();throw new Error('Original source range/size verification failed');}
  const declared=response.headers.get('content-length');if(declared!==null && Number(declared)!==length){await response.body.cancel();throw new Error('Original source range length differs');}
  const bytes=new Uint8Array(length),reader=response.body.getReader();let consumed=0;
  try{
   while(true){const next=await reader.read();if(next.done)break;if(consumed+next.value.byteLength>length)throw new Error('Original source exceeded its bounded range');bytes.set(next.value,consumed);consumed+=next.value.byteLength;}
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  if(consumed!==length)throw new Error('Original source range is truncated');
  etag=etag??response.headers.get('etag');return bytes;
 };
 return {read,async verify(source:ArchivedSource){
  const token=resolveLivepeerStudioAuthToken();if(!token)throw new Error('Existing Studio server credential unavailable');
  const target=await fetchStudioAssetDownloadTarget({baseUrl:'https://livepeer.studio',authToken:token,assetId:source.assetId,
   fetchImpl:async(input,init)=>{
    const response=await fetchImpl(input,{...init,cache:'no-store',redirect:'error',signal:signal()});
    if(response.ok){
     const body=await response.clone().json();const asset=body.asset??body;
     if(asset.id!==source.assetId || asset.playbackId!==source.playbackId || asset.status?.phase!=='ready')throw new Error('Studio source identity or readiness changed');
     if(asset.playbackPolicy && asset.playbackPolicy.type!=='public')throw new Error('Legacy gated source requires a reviewed access-policy migration');
    }
    return response;
   }});
  const parsed=new URL(target.downloadUrl);
  if(parsed.protocol!=='https:'||parsed.hostname!==SOURCE_HOST||parsed.port||parsed.username||parsed.password)throw new Error('Original source is outside the approved Studio CDN');
  url=parsed.toString();totalBytes=source.sizeBytes;
  const hash=createHash('sha256');
  for(let offset=0;offset<totalBytes;offset+=HASH_CHUNK_BYTES)hash.update(await read(offset,Math.min(HASH_CHUNK_BYTES,totalBytes-offset)));
  if(hash.digest('hex')!==source.sha256)throw new Error('Original source checksum differs from its archive');
  if(deadline-Date.now()<60_000)throw new Error('Insufficient transfer time remains after source verification');
 }};
}
