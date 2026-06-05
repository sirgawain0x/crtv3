import { fetchFeed } from '@lens-protocol/client/actions';
import { evmAddress } from '@lens-protocol/types';
import { createLensClient } from '@/lib/sdk/lens/create-client';
import { getLensNetwork, type LensNetwork } from '@/lib/sdk/lens/chains';
import {
  extractLensContractAddress,
  getLensContractAddressError,
} from '@/lib/sdk/lens/primitive-id';
import { getLensNetworkLabel, truncateFeedId } from '@/lib/songchain/feed-diagnostics';
import { getOrbErrorMessage } from '@/lib/sdk/orb/session-errors';

export type LensFeedCheckResult = {
  feedAddress: `0x${string}` | null;
  exists: boolean;
  error: string | null;
};

export function resolveSongchainFeedAddress(
  feedId: string | null | undefined,
): `0x${string}` | null {
  return extractLensContractAddress(feedId);
}

/** Query Lens API to confirm the feed primitive exists on the configured network. */
export async function checkLensFeedExists(
  feedId: string | null | undefined,
  network: LensNetwork = getLensNetwork(),
): Promise<LensFeedCheckResult> {
  const feedAddress = resolveSongchainFeedAddress(feedId);
  if (!feedAddress) {
    return {
      feedAddress: null,
      exists: false,
      error: getLensContractAddressError(feedId, 'Feed contract ID'),
    };
  }

  const client = createLensClient();
  const result = await fetchFeed(client, { feed: evmAddress(feedAddress) });

  if (result.isErr()) {
    return {
      feedAddress,
      exists: false,
      error: result.error.message,
    };
  }

  if (!result.value) {
    return {
      feedAddress,
      exists: false,
      error: buildFeedNotFoundMessage(feedId, network),
    };
  }

  return { feedAddress, exists: true, error: null };
}

export function buildFeedNotFoundMessage(
  feedId: string | null | undefined,
  network: LensNetwork = getLensNetwork(),
): string {
  const label = getLensNetworkLabel(network);
  const display = truncateFeedId(resolveSongchainFeedAddress(feedId) ?? feedId ?? null);
  return (
    `Feed ${display} is not registered on ${label}. ` +
    'Posts target a Lens feed contract, not an app contract. ' +
    'Set NEXT_PUBLIC_SONGCHAIN_APP_ID to your Lens app and omit FEED_ID to auto-resolve, ' +
    'or set NEXT_PUBLIC_SONGCHAIN_FEED_ID to a feed address from the app dashboard.'
  );
}

export function formatLensFeedPostError(
  error: unknown,
  feedId: string | null | undefined,
  network: LensNetwork = getLensNetwork(),
): string {
  const message = getOrbErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('feed does not exist') || lower.includes('feed is not registered')) {
    return buildFeedNotFoundMessage(feedId, network);
  }

  return message;
}
