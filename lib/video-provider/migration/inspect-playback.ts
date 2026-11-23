import {buildAuthorizedViewerPlayHlsUrl} from '../frameworks/playback';
/** Bounded staging diagnostic. Never return bearer URLs, manifest contents or raw provider messages. */
export async function inspectMigrationPlayback(playbackId:string,fetcher:typeof fetch=fetch){
 let url=buildAuthorizedViewerPlayHlsUrl({playbackId,subject:'migration-verification',expiresInSeconds:60});
 const hops:Array<{status:number;host:string;contentType:string;manifest:boolean;code?:string}>=[];
 for(let i=0;i<4;i++){
  const target=new URL(url);
  if(target.protocol!=='https:' || !(target.hostname==='frameworks.network'||target.hostname.endsWith('.frameworks.network')) || target.username || target.password) throw new Error('Unreviewed playback destination');
  const response=await fetcher(target,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'*/*'}});
  const contentType=(response.headers.get('content-type')??'').split(';')[0];
  const hop={status:response.status,host:target.hostname,contentType,manifest:false} as typeof hops[number];hops.push(hop);
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');await response.body?.cancel();if(!location)break;url=new URL(location,target).toString();continue;
  }
  const reader=response.body?.getReader();let body='';
  if(reader){try{while(body.length<4096){const next=await reader.read();if(next.done)break;body+=new TextDecoder().decode(next.value.subarray(0,4096-body.length));}}finally{await reader.cancel();}}
  hop.manifest=response.ok && body.trimStart().startsWith('#EXTM3U');
  if(contentType==='application/json'){try{const parsed=JSON.parse(body);if(typeof parsed.code==='string'&&/^[A-Z_]{1,80}$/.test(parsed.code))hop.code=parsed.code;}catch{}}
  return {playableManifest:hop.manifest,hops};
 }
 return {playableManifest:false,hops};
}
