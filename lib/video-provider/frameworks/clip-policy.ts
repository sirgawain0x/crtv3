import { frameworksGraphqlRequest } from '../frameworks-graphql';
import { isVideoAssetId } from '../asset-id';
import { requireVodSigningKeyId } from './vod-policy';

/** A clip has a distinct provider policy target; never treat its hash as a VOD upload. */
export async function secureFrameworksClip(assetId: string, playbackId: string): Promise<void> {
  if (!isVideoAssetId(assetId) || !isVideoAssetId(playbackId)) throw new Error('Invalid clip policy identity');
  const kid = requireVodSigningKeyId();
  const { setPlaybackPolicy: result } = await frameworksGraphqlRequest<{
    setPlaybackPolicy: { __typename: string; clipHash?: string; playbackId?: string;
      playbackPolicy?: { type: string; jwt?: { allowedKids?: string[]; requiredAudience?: string[] } | null } | null };
  }>(`mutation SecureClip($input:SetPlaybackPolicyInput!){setPlaybackPolicy(input:$input){__typename ... on Clip{clipHash playbackId playbackPolicy{type jwt{allowedKids requiredAudience}}}}}`, {
    input: { clipId: assetId, policy: { type: 'JWT', jwt: { allowedKids: [kid], requiredAudience: [playbackId] } } },
  });
  const policy = result.playbackPolicy;
  if (result.__typename !== 'Clip' || result.clipHash !== assetId || result.playbackId !== playbackId ||
      policy?.type !== 'JWT' || policy.jwt?.allowedKids?.length !== 1 || policy.jwt.allowedKids[0] !== kid ||
      policy.jwt.requiredAudience?.length !== 1 || policy.jwt.requiredAudience[0] !== playbackId) {
    throw new Error('FrameWorks did not confirm clip access protection');
  }
}

export async function requireReadyFrameworksClip(assetId: string, playbackId: string): Promise<void> {
  const { clip } = await frameworksGraphqlRequest<{clip: {clipHash:string;playbackId:string;status:string}|null}>(
    `query InspectProtectedClip($id:ID!){clip(id:$id){clipHash playbackId status}}`, { id: assetId });
  // The live Clip API reports completed artifacts as "done"; uploads use "ready".
  const completed = typeof clip?.status === 'string' && ['done', 'ready'].includes(clip.status.toLowerCase());
  if (!clip || clip.clipHash !== assetId || clip.playbackId !== playbackId || !completed) {
    throw new Error('Clip is not ready for publishing');
  }
  await secureFrameworksClip(assetId, playbackId);
}
