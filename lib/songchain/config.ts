import {
  buildHallidayInputAssets,
  buildHallidayOutputAsset,
  isHallidaySandboxEnabled,
  LENS_GHO_TOKEN_ADDRESS,
} from '@/lib/songchain/halliday';
import { getLensNetwork } from '@/lib/sdk/lens/chains';

export type SongchainConfig = {
  enabled: boolean;
  publicFeedId: string | null;
  exclusiveFeedId: string | null;
  groupId: string | null;
  hallidayApiKey: string | null;
  /** Halliday Payments SDK `outputs` entry, e.g. `lens:0x…800a`. */
  hallidayOutputAsset: string;
  /** Halliday Payments SDK `inputs` entries, e.g. `USD` for fiat onramp. */
  hallidayInputAssets: string[];
  hallidaySandbox: boolean;
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

  const network = getLensNetwork();

  return {
    enabled: Boolean(publicFeedId || exclusiveFeedId || groupId),
    publicFeedId,
    exclusiveFeedId,
    groupId,
    hallidayApiKey,
    hallidayOutputAsset: buildHallidayOutputAsset(
      network,
      tokenOverride ?? LENS_GHO_TOKEN_ADDRESS,
    ),
    hallidayInputAssets: buildHallidayInputAssets(),
    hallidaySandbox: isHallidaySandboxEnabled(),
  };
}
