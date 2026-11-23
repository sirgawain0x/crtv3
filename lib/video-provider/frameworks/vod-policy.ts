import { isVideoAssetId } from '../asset-id';
import { frameworksGraphqlRequest } from '../frameworks-graphql';

const SET_POLICY = `mutation SecureVod($input: SetPlaybackPolicyInput!) {
  setPlaybackPolicy(input: $input) {
    __typename
    ... on VodAsset { artifactHash playbackId playbackPolicy { type jwt { allowedKids requiredAudience } } }
  }
}`;
type PolicyResult = { setPlaybackPolicy: {
  __typename: string; artifactHash?: string; playbackId?: string;
  playbackPolicy?: { type: string; jwt?: { allowedKids?: string[]; requiredAudience?: string[] } | null } | null;
} };

export function requireVodSigningKeyId(): string {
  const kid = process.env.FRAMEWORKS_SIGNING_KID?.trim();
  if (!kid || !process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY?.trim()) {
    throw new Error('FrameWorks protected VOD signing is not configured');
  }
  return kid;
}

/** Apply before releasing upload parts. Every VOD stays JWT protected, even when publicly listed. */
export async function secureFrameworksVod(assetId: string, playbackId: string): Promise<void> {
  if (!isVideoAssetId(assetId) || !isVideoAssetId(playbackId)) throw new Error('Invalid VOD policy identity');
  const kid = requireVodSigningKeyId();
  const { setPlaybackPolicy: result } = await frameworksGraphqlRequest<PolicyResult>(SET_POLICY, {
    input: { vodAssetId: assetId, policy: { type: 'JWT', jwt: { allowedKids: [kid], requiredAudience: [playbackId] } } },
  });
  const jwt = result.playbackPolicy?.jwt;
  if (result.__typename !== 'VodAsset' || result.artifactHash !== assetId || result.playbackId !== playbackId ||
      result.playbackPolicy?.type !== 'JWT' || jwt?.allowedKids?.length !== 1 || jwt.allowedKids[0] !== kid ||
      jwt.requiredAudience?.length !== 1 || jwt.requiredAudience[0] !== playbackId) {
    throw new Error('FrameWorks did not confirm the required VOD access policy');
  }
}
