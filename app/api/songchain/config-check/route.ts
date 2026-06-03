import { NextResponse } from 'next/server';
import { getSongchainConfig } from '@/lib/songchain/config';
import { getLensNetwork } from '@/lib/sdk/lens/chains';
import {
  getLensNetworkLabel,
  truncateFeedId,
} from '@/lib/songchain/feed-diagnostics';

export const dynamic = 'force-dynamic';

/** Public health check for Songchain / Lens env (no secrets). */
export async function GET() {
  const config = getSongchainConfig();
  const network = getLensNetwork();

  return NextResponse.json({
    ok: config.enabled,
    lensNetwork: network,
    lensNetworkLabel: getLensNetworkLabel(network),
    feeds: {
      publicConfigured: Boolean(config.publicFeedId),
      publicFeedId: truncateFeedId(config.publicFeedId),
      exclusiveConfigured: Boolean(config.exclusiveFeedId),
      exclusiveFeedId: truncateFeedId(config.exclusiveFeedId),
      groupConfigured: Boolean(config.groupId),
      groupId: truncateFeedId(config.groupId),
    },
    hints: config.enabled
      ? []
      : [
          'Set NEXT_PUBLIC_SONGCHAIN_FEED_ID (and related vars) in your deployment environment.',
          'Ensure NEXT_PUBLIC_LENS_ENV matches the network where feeds were created.',
        ],
  });
}
