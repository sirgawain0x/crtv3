import { getLensNetwork, type LensNetwork } from '@/lib/sdk/lens/chains';

export function truncateFeedId(feedId: string | null): string {
  if (!feedId) return 'not configured';
  if (feedId.length <= 14) return feedId;
  return `${feedId.slice(0, 8)}…${feedId.slice(-6)}`;
}

export function getLensNetworkLabel(network: LensNetwork = getLensNetwork()): string {
  return network === 'mainnet' ? 'Lens mainnet' : 'Lens testnet (Sepolia)';
}

export type FeedDiagnosticInfo = {
  lensNetwork: LensNetwork;
  lensNetworkLabel: string;
  feedId: string | null;
  feedIdDisplay: string;
};

export function getFeedDiagnosticInfo(feedId: string | null): FeedDiagnosticInfo {
  const lensNetwork = getLensNetwork();
  return {
    lensNetwork,
    lensNetworkLabel: getLensNetworkLabel(lensNetwork),
    feedId,
    feedIdDisplay: truncateFeedId(feedId),
  };
}
