import {
  buildHallidayInputAssets,
  buildHallidayOutputAsset,
  isHallidaySandboxEnabled,
  LENS_GHO_TOKEN_ADDRESS,
} from "@/lib/songchain/halliday";
import { getLensNetwork } from "@/lib/sdk/lens/chains";
import { normalizeLensPrimitiveId } from "@/lib/sdk/lens/primitive-id";
import type { SongchainConfig } from "@/lib/songchain/config";

export type SpindriftConfig = SongchainConfig;

function readEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function readLensPrimitiveEnv(...keys: string[]): string | null {
  const value = readEnv(...keys);
  return normalizeLensPrimitiveId(value);
}

/**
 * Reads Spindrift channel configuration from environment variables.
 */
export function getSpindriftConfig(): SpindriftConfig {
  const appId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_SPINDRIFT_APP_ID",
    "SPINDRIFT_APP_ID",
  );
  const publicFeedId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_SPINDRIFT_FEED_ID",
    "SPINDRIFT_FEED_ID",
  );
  const exclusiveFeedId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_SPINDRIFT_EXCLUSIVE_FEED_ID",
    "SPINDRIFT_EXCLUSIVE_FEED_ID",
  );
  const groupId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_SPINDRIFT_GROUP_ID",
    "SPINDRIFT_GROUP_ID",
  );
  const graphId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_SPINDRIFT_GRAPH_ID",
    "SPINDRIFT_GRAPH_ID",
  );

  const tokenOverride = readEnv(
    "NEXT_PUBLIC_HALLIDAY_DESTINATION_TOKEN",
    "HALLIDAY_DESTINATION_TOKEN",
  );

  const hallidayApiKey = readEnv(
    "NEXT_PUBLIC_HALLIDAY_API_KEY",
    "HALLIDAY_API_KEY",
  );

  const network = getLensNetwork();

  return {
    enabled: Boolean(appId || publicFeedId || exclusiveFeedId || groupId || graphId),
    appId,
    publicFeedId,
    exclusiveFeedId,
    groupId,
    graphId,
    hallidayApiKey,
    hallidayOutputAsset: buildHallidayOutputAsset(
      network,
      tokenOverride ?? LENS_GHO_TOKEN_ADDRESS,
    ),
    hallidayInputAssets: buildHallidayInputAssets(),
    hallidaySandbox: isHallidaySandboxEnabled(),
    season2Enabled: false,
    season2PublicFeedId: null,
    season2ExclusiveFeedId: null,
    season2LockAddress: null,
  };
}

/**
 * Mixer Culture campaign Lens primitives (used on `/spindrift/mixer-culture` only).
 */
export function getMixerCultureConfig(): SpindriftConfig {
  const shared = getSpindriftConfig();

  const appId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_MIXER_CULTURE_APP_ID",
    "MIXER_CULTURE_APP_ID",
  );
  const publicFeedId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_MIXER_CULTURE_FEED_ID",
    "MIXER_CULTURE_FEED_ID",
  );
  const exclusiveFeedId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_MIXER_CULTURE_EXCLUSIVE_FEED_ID",
    "MIXER_CULTURE_EXCLUSIVE_FEED_ID",
  );
  const groupId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_MIXER_CULTURE_GROUP_ID",
    "MIXER_CULTURE_GROUP_ID",
  );
  const graphId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_MIXER_CULTURE_GRAPH_ID",
    "MIXER_CULTURE_GRAPH_ID",
  );

  return {
    enabled: Boolean(appId || publicFeedId || exclusiveFeedId || groupId || graphId),
    appId,
    publicFeedId,
    exclusiveFeedId,
    groupId,
    graphId,
    hallidayApiKey: shared.hallidayApiKey,
    hallidayOutputAsset: shared.hallidayOutputAsset,
    hallidayInputAssets: shared.hallidayInputAssets,
    hallidaySandbox: shared.hallidaySandbox,
    season2Enabled: false,
    season2PublicFeedId: null,
    season2ExclusiveFeedId: null,
    season2LockAddress: null,
  };
}

/**
 * BigMoney parallel config slot (optional secondary campaign feed/group).
 */
export function getBigMoneyConfig(): SpindriftConfig {
  const shared = getSpindriftConfig();

  const appId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_BIGMONEY_APP_ID",
    "BIGMONEY_APP_ID",
  );
  const publicFeedId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_BIGMONEY_FEED_ID",
    "BIGMONEY_FEED_ID",
  );
  const exclusiveFeedId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_BIGMONEY_EXCLUSIVE_FEED_ID",
    "BIGMONEY_EXCLUSIVE_FEED_ID",
  );
  const groupId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_BIGMONEY_GROUP_ID",
    "BIGMONEY_GROUP_ID",
  );
  const graphId = readLensPrimitiveEnv(
    "NEXT_PUBLIC_BIGMONEY_GRAPH_ID",
    "BIGMONEY_GRAPH_ID",
  );

  return {
    enabled: Boolean(appId || publicFeedId || exclusiveFeedId || groupId || graphId),
    appId,
    publicFeedId,
    exclusiveFeedId,
    groupId,
    graphId,
    hallidayApiKey: shared.hallidayApiKey,
    hallidayOutputAsset: shared.hallidayOutputAsset,
    hallidayInputAssets: shared.hallidayInputAssets,
    hallidaySandbox: shared.hallidaySandbox,
    season2Enabled: false,
    season2PublicFeedId: null,
    season2ExclusiveFeedId: null,
    season2LockAddress: null,
  };
}
