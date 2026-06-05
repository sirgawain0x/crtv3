import type { LensAuthPluginConfig } from '@orbclub/modules/auth/lens';
import type { MediaPluginConfig } from '@orbclub/modules/media';
import type { QrAuthPluginConfig } from '@orbclub/modules/auth/qr';
import type { OrbLoginConfig } from '@orbclub/modules/auth';
import type { GroveUploadPluginConfig } from '@orbclub/modules/upload/grove';
import { getLensChainId } from '@/lib/sdk/lens/chains';

/** @orbclub/modules defaults when using `createOrbLogin()` with no overrides. */
export const ORB_SDK_QR_INIT_DEFAULT = 'https://orbapi.xyz/init-sign-in';
export const ORB_SDK_QR_POLL_DEFAULT = 'https://orbapi.xyz/poll-sign-in';
export const ORB_SDK_LENS_GRAPHQL_DEFAULT = 'https://api.lens.xyz/graphql';

/**
 * Creative TV defaults: same-origin proxies so the browser avoids orbapi.xyz CORS.
 * Set `NEXT_PUBLIC_QR_INIT_URL` / `NEXT_PUBLIC_QR_POLL_URL` to the SDK URLs above
 * only if orbapi.xyz allows your production origin.
 */
export const ORB_APP_QR_INIT_PROXY = '/api/auth/orb/qr/init';
export const ORB_APP_QR_POLL_PROXY = '/api/auth/orb/qr/poll';

/** First set `NEXT_PUBLIC_*` key wins. Maps Orb docs names → Next.js client env. */
function readClientEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Resolve relative app proxy paths to absolute URLs for Orb SDK fetch calls. */
function resolveClientUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (typeof window !== 'undefined') {
    return new URL(pathOrUrl, window.location.origin).toString();
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'https://tv.creativeplatform.xyz';

  return new URL(pathOrUrl, siteUrl.replace(/\/$/, '')).toString();
}

/** Resolved Orb/Lens auth + media config from app env (@orbclub/modules does not read env). */
export function getOrbLoginConfig(): OrbLoginConfig {
  const qr: QrAuthPluginConfig = {};
  const lens: LensAuthPluginConfig = {};

  const graphqlUrl = readClientEnv('NEXT_PUBLIC_LENS_GRAPHQL_URL');
  if (graphqlUrl) lens.graphqlUrl = graphqlUrl;

  const initPath =
    readClientEnv('NEXT_PUBLIC_QR_INIT_URL', 'NEXT_PUBLIC_ORB_QR_INIT_URL') ??
    ORB_APP_QR_INIT_PROXY;
  const pollPath =
    readClientEnv('NEXT_PUBLIC_QR_POLL_URL', 'NEXT_PUBLIC_ORB_QR_POLL_URL') ??
    ORB_APP_QR_POLL_PROXY;

  qr.initUrl = resolveClientUrl(initPath);
  qr.pollUrl = resolveClientUrl(pollPath);

  return { qr, lens };
}

export function getOrbMediaConfig(): MediaPluginConfig {
  const ipfsGateway =
    readClientEnv('NEXT_PUBLIC_IPFS_GATEWAY') || 'https://w3s.link/ipfs';
  return {
    ipfsGateway,
    imageGateway:
      readClientEnv('NEXT_PUBLIC_MEDIA_GATEWAY', 'NEXT_PUBLIC_ORB_MEDIA_GATEWAY') ||
      ipfsGateway,
    lensGateway:
      readClientEnv('NEXT_PUBLIC_LENS_GATEWAY', 'NEXT_PUBLIC_ORB_LENS_GATEWAY') ||
      'https://api.grove.storage/ipfs',
    arweaveGateway:
      readClientEnv('NEXT_PUBLIC_ARWEAVE_GATEWAY', 'NEXT_PUBLIC_ORB_ARWEAVE_GATEWAY') ||
      'https://arweave.net',
    defaultThumbnailDimension: 768,
  };
}

export function getOrbGroveUploadConfig(): GroveUploadPluginConfig {
  return {
    apiUrl: readClientEnv('NEXT_PUBLIC_GROVE_API_URL'),
    chainId: getLensChainId(),
  };
}
