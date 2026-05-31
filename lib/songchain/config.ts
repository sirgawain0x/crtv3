import { getLensChainId, getLensNetwork } from '@/lib/sdk/lens/chains';

/** Lens GHO on mainnet (wrapped gas token). Same address pattern on Lens Chain. */
const LENS_GHO_ADDRESS = '0x000000000000000000000000000000000000800A' as const;

export type SongchainConfig = {
  enabled: boolean;
  publicFeedId: string | null;
  exclusiveFeedId: string | null;
  groupId: string | null;
  hallidayApiKey: string | null;
  hallidayDestinationChainId: number;
  hallidayDestinationTokenAddress: string;
};

function readEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function readAddressEnv(...keys: string[]): string | null {
  const value = readEnv(...keys);
  if (!value) return null;
  return value.toLowerCase();
}

/**
 * Reads Songchain configuration from environment variables.
 *
 * Prefer calling this from Server Components or Route Handlers so values reflect
 * runtime env (e.g. Vercel) without requiring a client rebuild. Client
 * components should receive the result via props instead of calling this directly.
 */
export function getSongchainConfig(): SongchainConfig {
  const publicFeedId = readAddressEnv(
    'NEXT_PUBLIC_SONGCHAIN_FEED_ID',
    'SONGCHAIN_FEED_ID',
  );
  const exclusiveFeedId = readAddressEnv(
    'NEXT_PUBLIC_SONGCHAIN_EXCLUSIVE_FEED_ID',
    'SONGCHAIN_EXCLUSIVE_FEED_ID',
  );
  const groupId = readAddressEnv(
    'NEXT_PUBLIC_SONGCHAIN_GROUP_ID',
    'SONGCHAIN_GROUP_ID',
  );

  const tokenOverride = readEnv(
    'NEXT_PUBLIC_HALLIDAY_DESTINATION_TOKEN',
    'HALLIDAY_DESTINATION_TOKEN',
  );

  const hallidayApiKey = readEnv(
    'NEXT_PUBLIC_HALLIDAY_API_KEY',
    'HALLIDAY_API_KEY',
  );

  return {
    enabled: Boolean(publicFeedId || exclusiveFeedId || groupId),
    publicFeedId,
    exclusiveFeedId,
    groupId,
    hallidayApiKey,
    hallidayDestinationChainId: getLensChainId(getLensNetwork()),
    hallidayDestinationTokenAddress: tokenOverride || LENS_GHO_ADDRESS,
  };
}
