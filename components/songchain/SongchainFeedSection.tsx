"use client";

import { forwardRef, useImperativeHandle } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSongchainFeed } from "@/hooks/useSongchainFeed";
import { SongchainPostCard } from "@/components/songchain/SongchainPostCard";
import { SongchainPendingPostCard } from "@/components/songchain/SongchainPendingPostCard";
import {
  SongchainPostTimeline,
  SongchainPostTimelineItem,
} from "@/components/songchain/SongchainPostTimeline";
import { isQuotePost } from "@/lib/songchain/post-utils";
import { getFeedDiagnosticInfo } from "@/lib/songchain/feed-diagnostics";
import type { SongchainCreatedPost } from "@/lib/songchain/feed-types";

type SongchainFeedSectionProps = {
  title: string;
  description: string;
  feedId: string | null;
  graphId?: string | null;
  emptyDescription: string;
  onPostUpdated?: () => void;
  /** When false, skips fetching posts (e.g. club feed before join). */
  enabled?: boolean;
};

export type SongchainFeedHandle = {
  registerNewPost: (created: SongchainCreatedPost) => void;
  reload: () => void;
};

function FeedDiagnostics({
  feedId,
  error,
  isEmpty,
}: {
  feedId: string | null;
  error: string | null;
  isEmpty: boolean;
}) {
  const info = getFeedDiagnosticInfo(feedId);

  return (
    <div className="mb-4 rounded-md border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
      <p>
        <span className="font-medium text-foreground">Lens network:</span>{" "}
        {info.lensNetworkLabel}
        {info.lensNetwork === "testnet" && (
          <span className="ml-1">
            — set <code className="text-[10px]">NEXT_PUBLIC_LENS_ENV=production</code> for
            mainnet feeds
          </span>
        )}
      </p>
      <p>
        <span className="font-medium text-foreground">Feed:</span>{" "}
        <code className="text-[10px]">{info.feedIdDisplay}</code>
      </p>
      {error && (
        <p className="text-destructive">
          <span className="font-medium">API error:</span> {error}
        </p>
      )}
      {isEmpty && !error && feedId && (
        <p>
          Feed is reachable but has no posts yet. Posts must be created on this custom feed
          address (not the global Lens timeline).
        </p>
      )}
      {error && error.includes("not registered on") && (
        <p>
          Fix <code className="text-[10px]">NEXT_PUBLIC_SONGCHAIN_FEED_ID</code> in your
          deployment env, then redeploy. Use the feed contract address from the Lens / Orb
          dashboard — not the feed display name.
        </p>
      )}
    </div>
  );
}

export const SongchainFeedSection = forwardRef<SongchainFeedHandle, SongchainFeedSectionProps>(
  function SongchainFeedSection(
    { title, description, feedId, graphId = null, emptyDescription, onPostUpdated, enabled = true },
    ref,
  ) {
    const { posts, pendingPosts, loading, error, hasMore, reload, loadMore, registerNewPost } =
      useSongchainFeed({ feedId, enabled });

    useImperativeHandle(
      ref,
      () => ({ registerNewPost, reload }),
      [registerNewPost, reload],
    );

    if (!feedId) {
      const info = getFeedDiagnosticInfo(null);
      return (
        <section className="rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
          <p className="text-sm">Feed address not configured yet.</p>
          <p className="mt-3 text-xs">
            Set <code>NEXT_PUBLIC_SONGCHAIN_FEED_ID</code> ({info.lensNetworkLabel}) in your
            environment, then redeploy if needed.
          </p>
        </section>
      );
    }

    const hasVisiblePosts = posts.length > 0 || pendingPosts.length > 0;

    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>

        <FeedDiagnostics
          feedId={feedId}
          error={error}
          isEmpty={!loading && !hasVisiblePosts}
        />

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Could not load posts.
            <Button variant="link" className="ml-2 h-auto p-0" onClick={() => reload()}>
              Retry
            </Button>
          </div>
        )}

        {loading && !hasVisiblePosts ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasVisiblePosts ? (
          <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-border/60 p-8 text-center">
            <p className="font-medium text-foreground">No posts found in this feed yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : (
          <SongchainPostTimeline>
            {pendingPosts.map((pending) => (
              <SongchainPostTimelineItem key={pending.localId}>
                <SongchainPendingPostCard
                  pending={pending}
                  onRefresh={() => reload()}
                />
              </SongchainPostTimelineItem>
            ))}
            {posts.map((post) => (
              <SongchainPostTimelineItem key={post.id} isQuote={isQuotePost(post)}>
                <SongchainPostCard
                  post={post}
                  feedId={feedId}
                  graphId={graphId}
                  onReactionChange={reload}
                  onPostUpdated={onPostUpdated}
                />
              </SongchainPostTimelineItem>
            ))}
          </SongchainPostTimeline>
        )}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" disabled={loading} onClick={() => void loadMore()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load more
            </Button>
          </div>
        )}
      </section>
    );
  },
);
