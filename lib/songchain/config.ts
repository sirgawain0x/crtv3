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

function readAddressEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  if (!value) return null;
  return value.toLowerCase();
}

export function getSongchainConfig(): SongchainConfig {
  const publicFeedId = readAddressEnv('NEXT_PUBLIC_SONGCHAIN_FEED_ID');
  const exclusiveFeedId = readAddressEnv('NEXT_PUBLIC_SONGCHAIN_EXCLUSIVE_FEED_ID');
  const groupId = readAddressEnv('NEXT_PUBLIC_SONGCHAIN_GROUP_ID');

  const tokenOverride = process.env.NEXT_PUBLIC_HALLIDAY_DESTINATION_TOKEN?.trim();

  return {
    enabled: Boolean(publicFeedId || exclusiveFeedId || groupId),
    publicFeedId,
    exclusiveFeedId,
    groupId,
    hallidayApiKey: process.env.NEXT_PUBLIC_HALLIDAY_API_KEY?.trim() || null,
    hallidayDestinationChainId: getLensChainId(getLensNetwork()),
    hallidayDestinationTokenAddress: tokenOverride || LENS_GHO_ADDRESS,
  };
}
