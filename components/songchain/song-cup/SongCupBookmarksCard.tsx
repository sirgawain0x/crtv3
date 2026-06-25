"use client";

import { Loader2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSongchainBookmarks } from "@/hooks/useSongchainBookmarks";
import { SongchainPostCard } from "@/components/songchain/SongchainPostCard";
import {
  SongchainPostTimeline,
  SongchainPostTimelineItem,
} from "@/components/songchain/SongchainPostTimeline";
import { isQuotePost } from "@/lib/songchain/post-utils";

type SongCupBookmarksCardProps = {
  graphId?: string | null;
};

export function SongCupBookmarksCard({ graphId }: SongCupBookmarksCardProps) {
  const { posts, loading, error, reload } = useSongchainBookmarks();

  return (
    <section className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-black p-5 shadow-[0_0_24px_rgba(245,158,11,0.10)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold uppercase tracking-wide text-white">My Bookmarks</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => reload()}
          className="text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading && posts.length === 0 ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading bookmarks…
        </div>
      ) : posts.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No bookmarks yet. Save posts from the feed to see them here.
        </p>
      ) : (
        <SongchainPostTimeline className="max-w-none">
          {posts.slice(0, 5).map((post) => (
            <SongchainPostTimelineItem key={post.id} isQuote={isQuotePost(post)}>
              <SongchainPostCard post={post} graphId={graphId} compact />
            </SongchainPostTimelineItem>
          ))}
        </SongchainPostTimeline>
      )}
    </section>
  );
}
