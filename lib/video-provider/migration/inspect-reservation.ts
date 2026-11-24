import { frameworksGraphqlRequest } from '../frameworks-graphql';
import { isVideoAssetId } from '../asset-id';
import type { ArchivedSource } from './archive';

/** Classify configuration without returning a secret, its fingerprint or any bearer URL. */
export function webhookSecretFormat(value = process.env.FRAMEWORKS_WEBHOOK_SECRET) {
  const raw = value?.trim();
  if (!raw) return 'missing';
  if (/^["']|["']$/.test(raw)) return 'quoted';
  const encoded = raw.startsWith('whsec_') ? raw.slice(6) : raw;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) return 'invalid';
  return Buffer.from(encoded, 'base64').length >= 16 ? 'valid-base64' : 'invalid';
}

/** Read-only reconciliation: never create, delete, adopt or retry an uncertain upload. */
export async function inspectMigrationReservation(source: ArchivedSource) {
  const configuration = { webhookSecretFormat: webhookSecretFormat(), signingConfigured: Boolean(process.env.FRAMEWORKS_SIGNING_KID?.trim() && process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY?.trim()) };
  try {
    const result = await frameworksGraphqlRequest<{ storageArtifactsConnection: {
      totalCount: number; hasNextPage: boolean;
      nodes: Array<{ hash: string; playbackId: string | null; title: string; status: string; sizeBytes: number | null }>;
    } }>('query InspectMigrationReservation($input:StorageArtifactsInput!){storageArtifactsConnection(input:$input){totalCount hasNextPage nodes{hash playbackId title status sizeBytes}}}', { input: { kinds: ['VOD'], search: source.assetId, first: 10 } });
    const artifacts = result.storageArtifactsConnection.nodes.filter(node => node.title === source.assetId).map(node => {
      const assetId=isVideoAssetId(node.hash)?node.hash:null;
      const playbackId=node.playbackId&&isVideoAssetId(node.playbackId)?node.playbackId:null;
      return { assetId, playbackId, identityUsable:Boolean(assetId&&playbackId),sizeMatches: node.sizeBytes === source.sizeBytes,
        status: ['processing', 'ready', 'failed', 'expired'].includes(node.status.toLowerCase()) ? node.status.toLowerCase() : 'unknown' };
    });
    return { configuration, providerAvailable: true, completeSearch: !result.storageArtifactsConnection.hasNextPage, matchingArtifacts: artifacts };
  } catch {
    return { configuration, providerAvailable: false, completeSearch: false, matchingArtifacts: [] };
  }
}
