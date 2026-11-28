import { createServiceClient } from '@/lib/sdk/supabase/service';
import { frameworksGraphqlRequest } from '../frameworks-graphql';
/** Resolve only a stored channel; never send FrameWorks IDs to the retired metrics service. */
export async function getFrameworksViewerCount(playbackId: string): Promise<number | null> {
  const {data,error}=await createServiceClient().from('streams').select('stream_id').eq('playback_id',playbackId).maybeSingle();
  if(error) throw new Error('Channel lookup unavailable');
  if(!data?.stream_id) return null;
  const result=await frameworksGraphqlRequest<{stream:{metrics:{currentViewers:number}|null}|null}>(
    'query ChannelViewers($id: ID!) { stream(id: $id) { metrics { currentViewers } } }',{id:data.stream_id});
  const count=result.stream?.metrics?.currentViewers;
  return Number.isSafeInteger(count) && count!>=0 ? count! : null;
}
