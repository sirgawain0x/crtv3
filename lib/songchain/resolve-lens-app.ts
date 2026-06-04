import { fetchApp, fetchAppFeeds, fetchFeed } from '@lens-protocol/client/actions';
import { evmAddress } from '@lens-protocol/types';
import { createLensClient } from '@/lib/sdk/lens/create-client';
import { normalizeLensPrimitiveId } from '@/lib/sdk/lens/primitive-id';
import type { SongchainConfig } from '@/lib/songchain/config';

export type ResolvedSongchainConfig = SongchainConfig & {
  /** Lens app contract when configured or inferred. */
  appId: string | null;
  /** Human-readable notes from app/feed resolution (server diagnostics). */
  resolutionNotes: string[];
};

function normalizeAddress(value: string | null | undefined): string | null {
  return normalizeLensPrimitiveId(value);
}

async function lensAppExists(appAddress: string): Promise<boolean> {
  const client = createLensClient();
  const result = await fetchApp(client, { app: evmAddress(appAddress) });
  return result.isOk() && !!result.value;
}

async function lensFeedExists(feedAddress: string): Promise<boolean> {
  const client = createLensClient();
  const result = await fetchFeed(client, { feed: evmAddress(feedAddress) });
  return result.isOk() && !!result.value;
}

/**
 * Resolves Songchain feed IDs from a Lens app when env points at the app contract
 * (common mistake) or when explicit feed IDs are omitted.
 */
export async function resolveSongchainConfig(
  config: SongchainConfig,
): Promise<ResolvedSongchainConfig> {
  const notes: string[] = [];
  let appId = normalizeAddress(config.appId);
  let publicFeedId = normalizeAddress(config.publicFeedId);
  let exclusiveFeedId = normalizeAddress(config.exclusiveFeedId);
  const groupId = normalizeAddress(config.groupId);
  let graphId = normalizeAddress(config.graphId);

  if (!appId && publicFeedId && !(await lensFeedExists(publicFeedId))) {
    if (await lensAppExists(publicFeedId)) {
      notes.push(
        'NEXT_PUBLIC_SONGCHAIN_FEED_ID is a Lens app address; resolving feeds from the app.',
      );
      appId = publicFeedId;
      publicFeedId = null;
    }
  }

  if (!appId && exclusiveFeedId && !(await lensFeedExists(exclusiveFeedId))) {
    if (await lensAppExists(exclusiveFeedId)) {
      notes.push(
        'NEXT_PUBLIC_SONGCHAIN_EXCLUSIVE_FEED_ID is a Lens app address; resolving from the app.',
      );
      appId = exclusiveFeedId;
      exclusiveFeedId = null;
    }
  }

  if (!appId) {
    return {
      ...config,
      appId: null,
      publicFeedId,
      exclusiveFeedId,
      groupId,
      graphId,
      resolutionNotes: notes,
    };
  }

  const client = createLensClient();
  const appResult = await fetchApp(client, { app: evmAddress(appId) });
  if (appResult.isErr() || !appResult.value) {
    notes.push(`Lens app ${appId} was not found on this network.`);
    return { ...config, appId, publicFeedId, exclusiveFeedId, groupId, graphId, resolutionNotes: notes };
  }

  const app = appResult.value;
  const defaultFeed = normalizeAddress(app.defaultFeedAddress ?? null);
  const appGraph = normalizeAddress(app.graphAddress ?? null);

  if (!graphId && appGraph) {
    graphId = appGraph;
    notes.push(`Using app graph ${appGraph} for Songchain follows.`);
  }

  const feedsResult = await fetchAppFeeds(client, { app: evmAddress(appId) });
  const appFeedIds = feedsResult.isOk()
    ? feedsResult.value.items
        .map((item) => normalizeAddress(String(item.feed)))
        .filter((id): id is string => !!id)
    : [];

  if (!exclusiveFeedId && defaultFeed) {
    exclusiveFeedId = defaultFeed;
    notes.push(`Using app default feed ${defaultFeed} for the exclusive feed tab.`);
  }

  if (!publicFeedId) {
    const alternate = appFeedIds.find(
      (feedId) => feedId.toLowerCase() !== exclusiveFeedId?.toLowerCase(),
    );
    publicFeedId = alternate ?? defaultFeed;
    if (publicFeedId) {
      notes.push(`Using app-linked feed ${publicFeedId} for the public feed tab.`);
    }
  }

  if (publicFeedId?.toLowerCase() === appId.toLowerCase()) {
    publicFeedId = appFeedIds.find(
      (feedId) => feedId.toLowerCase() !== exclusiveFeedId?.toLowerCase(),
    ) ?? defaultFeed;
    notes.push('Public feed env matched the app contract; substituted the app feed address.');
  }

  return {
    ...config,
    enabled: Boolean(publicFeedId || exclusiveFeedId || groupId || graphId),
    appId,
    publicFeedId,
    exclusiveFeedId,
    groupId,
    graphId,
    resolutionNotes: notes,
  };
}
