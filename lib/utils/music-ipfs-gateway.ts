/**
 * IPFS gateway utilities for the Universal Music Indexer.
 * Uses Grove (api.grove.storage) as the primary gateway for music metadata and audio.
 */
import {
  extractIpfsHash,
} from '@/lib/utils/image-gateway';

const GROVE_GATEWAY = 'https://api.grove.storage/ipfs';

const MUSIC_IPFS_GATEWAYS = [
  GROVE_GATEWAY,
  'https://w3s.link/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://gateway.ipfscdn.io/ipfs',
  'https://gateway.lighthouse.storage/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://dweb.link/ipfs',
  'https://ipfs.io/ipfs',
];

export function musicIpfsToGroveGateway(uri: string): string {
  if (!uri || typeof uri !== 'string') return '';
  const hash = extractIpfsHash(uri);
  if (!hash) return uri;
  return `${GROVE_GATEWAY}/${hash}`;
}

export function getMusicIpfsUrl(uriOrHash: string, gatewayIndex: number = 0): string {
  if (!uriOrHash || typeof uriOrHash !== 'string') return '';
  const hash = extractIpfsHash(uriOrHash);
  if (!hash) return uriOrHash;
  const gateway = MUSIC_IPFS_GATEWAYS[gatewayIndex] ?? MUSIC_IPFS_GATEWAYS[0];
  return `${gateway}/${hash}`;
}

export function getMusicIpfsGatewayUrls(uriOrHash: string): string[] {
  const hash = extractIpfsHash(uriOrHash);
  if (!hash) return [uriOrHash];
  return MUSIC_IPFS_GATEWAYS.map((g) => `${g}/${hash}`);
}
