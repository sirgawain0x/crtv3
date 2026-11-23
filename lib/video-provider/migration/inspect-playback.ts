import {buildAuthorizedViewerPlayHlsUrl} from '../frameworks/playback';
import {inspectHlsManifest} from '../frameworks/hls-manifest';
import {frameworksGraphqlRequest} from '../frameworks-graphql';

async function inspectArtifact(hash:string){
 try{
  const data=await frameworksGraphqlRequest<{storageArtifactsConnection:{nodes:Array<{status:string;isFinalized:boolean|null;isSynced:boolean|null;hasLocalCopy:boolean|null;durationSeconds:number|null;tracks:Array<{codec:string}>}>}}>(`query InspectMigrationArtifact($input:StorageArtifactsInput!){storageArtifactsConnection(input:$input){nodes{status isFinalized isSynced hasLocalCopy durationSeconds tracks{codec}}}}`,{input:{artifactHash:hash,first:1}});
  const node=data.storageArtifactsConnection.nodes[0];
  if(!node)return {available:false};
  return {available:true,status:['ready','failed','processing','expired'].includes(node.status)?node.status:'unknown',isFinalized:node.isFinalized,isSynced:node.isSynced,hasLocalCopy:node.hasLocalCopy,durationSeconds:node.durationSeconds,codecs:node.tracks.map(track=>['h264','h265','aac','opus','vp9','av1','H264','AAC'].includes(track.codec)?track.codec:'other')};
 }catch{return {available:false};}
}
/** Bounded staging diagnostic. Never return bearer URLs, manifest contents or raw provider messages. */
export async function inspectMigrationPlayback(playbackId:string,fetcher:typeof fetch=fetch,artifactHash?:string){
 const artifact=artifactHash?await inspectArtifact(artifactHash):undefined;
 // Match the normal player token lifetime and session query, not only a short server probe.
 const initial=new URL(buildAuthorizedViewerPlayHlsUrl({playbackId,subject:'anonymous',expiresInSeconds:3600}));
 initial.searchParams.set('tkn','migrationverification');
 let url=initial.toString();
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
  const inspected=inspectHlsManifest(body);
  hop.manifest=response.ok && inspected.playable;
  if(inspected.errorCode)hop.code=inspected.errorCode;
  if(contentType==='application/json'){try{const parsed=JSON.parse(body);if(typeof parsed.code==='string'&&/^[A-Z_]{1,80}$/.test(parsed.code))hop.code=parsed.code;}catch{}}
  return {playableManifest:hop.manifest,hops,...(artifact?{artifact}:{})};
 }
 return {playableManifest:false,hops,...(artifact?{artifact}:{})};
}
