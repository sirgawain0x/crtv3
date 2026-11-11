import { describe, expect, it } from 'vitest';
import { HUB_ASSET_CONFIGS } from '@/lib/contracts/MeTokenHubs';
import type { MeTokenHubInfo } from '@/lib/hooks/metokens/useMeTokenHubs';
import { getCreationHubs } from './creation-hubs';

function hub(symbol: keyof typeof HUB_ASSET_CONFIGS): MeTokenHubInfo {
  const asset = HUB_ASSET_CONFIGS[symbol];
  return { hubId: asset.hubId, asset: asset.address, vault: asset.address, owner: asset.address,
    active: true, symbol, label: symbol, displayName: symbol, description: '', decimals: asset.decimals };
}

describe('creation hubs', () => {
  it('keeps active supported stable hubs and excludes legacy DAI', () => {
    expect(getCreationHubs(['DAI', 'USDC', 'USDS', 'GHO'].map((s) => hub(s as keyof typeof HUB_ASSET_CONFIGS)))
      .map((h) => h.symbol)).toEqual(['USDC', 'USDS', 'GHO']);
  });

  it('rejects unknown, inactive and mismatched onchain assets', () => {
    const usdc = hub('USDC');
    expect(getCreationHubs([
      { ...usdc, active: false },
      { ...usdc, asset: hub('GHO').asset },
      { ...usdc, hubId: 99 },
      { ...usdc, symbol: 'UNKNOWN' },
    ])).toEqual([]);
  });
});
