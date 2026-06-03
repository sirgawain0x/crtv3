"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSongchainPost } from "@/hooks/useSongchainPost";

type SongchainComposePostProps = {
  feedId: string | null;
  onPosted?: () => void;
};

export function SongchainComposePost({ feedId, onPosted }: SongchainComposePostProps) {
  const [content, setContent] = useState("");
  const { createPost, isPosting, canWrite, promptWriteAccess } = useSongchainPost();

  if (!feedId) return null;

  const handleSubmit = async () => {
    const ok = await createPost({ content, feedId });
    if (ok) {
      setContent("");
      onPosted?.();
    }
  };

  return (
    <section className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Create a post</h3>
      {!canWrite && (
        <p className="text-xs text-muted-foreground">
          Connect wallet, sign in with Orb, and link your profile to post to this feed.
        </p>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with Songchain…"
        rows={3}
        disabled={isPosting}
        maxLength={5000}
      />
      <div className="flex justify-end gap-2">
        {!canWrite ? (
          <Button type="button" variant="outline" size="sm" onClick={promptWriteAccess}>
            Link Orb to post
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={isPosting || !content.trim()}
            onClick={() => void handleSubmit()}
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Post
          </Button>
        )}
      </div>
    </section>
  );
}
