import { HUB_ASSET_CONFIGS, type HubAssetSymbol } from '@/lib/contracts/MeTokenHubs';
import type { MeTokenHubInfo } from '@/lib/hooks/metokens/useMeTokenHubs';

/** Only explicitly configured, address-matching, non-legacy stable hubs may create tokens. */
export function getCreationHubs(hubs: MeTokenHubInfo[]): MeTokenHubInfo[] {
  return hubs.filter((hub) => {
    if (!hub.active || hub.symbol === 'UNKNOWN') return false;
    const asset = HUB_ASSET_CONFIGS[hub.symbol as HubAssetSymbol];
    return Boolean(asset && !asset.deprecated && asset.hubId === hub.hubId &&
      asset.address.toLowerCase() === hub.asset.toLowerCase());
  });
}
