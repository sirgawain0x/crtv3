"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSongchainFeed } from "@/hooks/useSongchainFeed";
import { SongchainPostCard } from "@/components/songchain/SongchainPostCard";

type SongchainFeedSectionProps = {
  title: string;
  description: string;
  feedId: string | null;
};

export function SongchainFeedSection({
  title,
  description,
  feedId,
}: SongchainFeedSectionProps) {
  const { posts, loading, error, hasMore, reload, loadMore } = useSongchainFeed({
    feedId,
  });

  if (!feedId) {
    return (
      <section className="rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm">Feed address not configured yet.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <Button variant="link" className="ml-2 h-auto p-0" onClick={() => reload()}>
            Retry
          </Button>
        </div>
      )}

      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No posts in this feed yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <SongchainPostCard key={post.id} post={post} onReactionChange={reload} />
          ))}
        </div>
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
}
