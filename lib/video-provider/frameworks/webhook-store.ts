import { createServiceClient } from '@/lib/sdk/supabase/service';
export type ReadyWebhookArtifact={assetId:string;playbackId:string;name?:string;durationSeconds?:number};
export type DurableWebhookInput={eventId:string;type:string;payloadSha256:string;occurredAt:string;streamId?:string;artifact?:ReadyWebhookArtifact};
/** Receipts and effects share one server-only transaction. No early ACK or expired worker lease. */
export async function commitFrameworksWebhook(input:DurableWebhookInput):Promise<'processed'|'duplicate'|'ignored'> {
  const {data,error}=await createServiceClient().rpc('process_frameworks_webhook',{
    p_event_id:input.eventId,p_type:input.type,p_sha256:input.payloadSha256,p_occurred_at:input.occurredAt,
    p_stream_id:input.streamId??null,p_artifact:input.artifact??null,
  });
  if(error || !['processed','duplicate','ignored'].includes(data))throw new Error('FrameWorks webhook transaction failed');
  return data;
}
