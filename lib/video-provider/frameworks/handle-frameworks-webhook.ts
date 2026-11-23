import {createHash} from 'node:crypto';
import {getVideoProvider} from '../index';
import {isVideoAssetId} from '../asset-id';
import {FrameworksWebhookRetryableError} from './webhook-errors';
import {toFrameworksStreamNodeId} from './stream-id';
import {commitFrameworksWebhook,type ReadyWebhookArtifact} from './webhook-store';
export type FrameworksWebhookEvent={id:string;type:string;api_version?:string;created_at?:string;data:Record<string,unknown>};
const businessTypes=new Set(['stream.live','stream.idle','recording.ready','clip.ready','upload.ready']);
function string(data:Record<string,unknown>,key:string):string|undefined {
 const value=data[key];return typeof value==='string' && value.trim()?value.trim():undefined;
}
export async function handleFrameworksWebhookEvent(event:FrameworksWebhookEvent):Promise<'processed'|'duplicate'|'ignored'> {
 if(!event || typeof event.id!=='string' || !event.id.trim() || event.id.length>200 || typeof event.type!=='string') throw new Error('Invalid webhook identity');
 if(!businessTypes.has(event.type))return 'ignored';
 if(!event.created_at || !Number.isFinite(Date.parse(event.created_at)) || !event.data || typeof event.data!=='object' || Array.isArray(event.data))throw new FrameworksWebhookRetryableError('Business event is missing source timestamp or data');
 let streamId=string(event.data,'streamId');let artifact:ReadyWebhookArtifact|undefined;
 if(event.type==='stream.live' || event.type==='stream.idle') {
  if(!streamId)throw new FrameworksWebhookRetryableError('Stream event has no stream ID');
 }else{
  const raw=event.data.artifact;
  if(!raw || typeof raw!=='object' || Array.isArray(raw))throw new FrameworksWebhookRetryableError('Ready event has no artifact');
  const hash=string(raw as Record<string,unknown>,'artifactHash');
  const lookup=hash??string(raw as Record<string,unknown>,'artifactId');
  if(!lookup)throw new FrameworksWebhookRetryableError('Ready event has no artifact identity');
  const asset=await getVideoProvider().assets.get(lookup);
  if(!asset || !isVideoAssetId(asset.id) || !asset.playbackId || !isVideoAssetId(asset.playbackId) || asset.status?.phase!=='ready' || (hash && asset.id!==hash))throw new FrameworksWebhookRetryableError('Ready artifact is not available yet');
  if(event.type==='recording.ready' && asset.source?.type!=='recording')throw new FrameworksWebhookRetryableError('Artifact is not a recording');
  if(streamId && asset.source?.streamId && toFrameworksStreamNodeId(streamId)!==toFrameworksStreamNodeId(asset.source.streamId))throw new FrameworksWebhookRetryableError('Artifact parent stream conflicts with event');
  streamId=asset.source?.streamId??streamId;
  if(event.type==='recording.ready' && !streamId)throw new FrameworksWebhookRetryableError('Recording parent is missing');
  artifact={assetId:asset.id,playbackId:asset.playbackId,
    ...(asset.name?{name:asset.name.slice(0,500)}:{}),
    ...(Number.isFinite(asset.videoSpec?.duration) && asset.videoSpec!.duration!>=0?{durationSeconds:asset.videoSpec!.duration!}:{})};
 }
 return commitFrameworksWebhook({eventId:event.id,type:event.type,occurredAt:new Date(event.created_at).toISOString(),
  payloadSha256:createHash('sha256').update(JSON.stringify(event)).digest('hex'),
  streamId:streamId?toFrameworksStreamNodeId(streamId):undefined,artifact});
}
