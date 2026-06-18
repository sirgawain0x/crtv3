import { formatUnits, parseUnits } from 'viem';
import {
  getHubAssetByAddress,
  getHubAssetByHubId,
  type HubAssetConfig,
  type HubAssetSymbol,
  HUB_ASSET_CONFIGS,
  DEFAULT_HUB_ASSET,
  formatMeTokenBackingLabel,
} from '@/lib/contracts/MeTokenHubs';

export type { HubAssetConfig, HubAssetSymbol };

export function parseHubAssetAmount(amount: string, asset: HubAssetConfig | string): bigint {
  const config =
    typeof asset === 'string'
      ? getHubAssetByAddress(asset) ?? HUB_ASSET_CONFIGS[DEFAULT_HUB_ASSET]
      : asset;
  return parseUnits(amount || '0', config.decimals);
}

export function formatHubAssetAmount(amount: bigint, asset: HubAssetConfig | string): string {
  const config =
    typeof asset === 'string'
      ? getHubAssetByAddress(asset) ?? HUB_ASSET_CONFIGS[DEFAULT_HUB_ASSET]
      : asset;
  return formatUnits(amount, config.decimals);
}

export function resolveHubAsset(hubId?: number, assetAddress?: string): HubAssetConfig {
  if (assetAddress) {
    const byAddress = getHubAssetByAddress(assetAddress);
    if (byAddress) return byAddress;
  }
  if (hubId != null) {
    const byHub = getHubAssetByHubId(hubId);
    if (byHub) return byHub;
  }
  return HUB_ASSET_CONFIGS[DEFAULT_HUB_ASSET];
}

export function collateralLabel(config: HubAssetConfig): string {
  return config.displayName;
}

export function getMeTokenBackingLabel(hubId: number): string {
  return formatMeTokenBackingLabel(hubId);
}
