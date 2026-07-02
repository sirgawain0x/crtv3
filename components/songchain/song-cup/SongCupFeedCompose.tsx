"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSongchainPost } from "@/hooks/useSongchainPost";
import type { SongchainCreatedPost } from "@/lib/songchain/feed-types";
import { cn } from "@/lib/utils/utils";
import {
  songCupBorderAccent,
  songCupMuted,
  songCupPanelInset,
} from "@/lib/songchain/song-cup/panel-styles";

type SongCupFeedComposeProps = {
  feedId: string | null;
  onPosted?: (created: SongchainCreatedPost) => void;
};

export function SongCupFeedCompose({ feedId, onPosted }: SongCupFeedComposeProps) {
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);

  const { createPost, isPosting, canWrite, needsOrbReauth, promptWriteAccess } =
    useSongchainPost();

  if (!feedId) return null;

  const hasContent = content.trim().length > 0;
  const canSubmit = hasContent;

  const handleSubmit = async () => {
    const created = await createPost({
      content,
      feedId,
    });
    if (created) {
      setContent("");
      setFocused(false);
      onPosted?.(created);
    }
  };

  const showExpanded = focused || hasContent;

  return (
    <div className={cn("relative min-h-[117px] p-4", songCupPanelInset, songCupBorderAccent, "border")}>
      {!showExpanded ? (
        <button
          type="button"
          onClick={() => setFocused(true)}
          className={cn(
            "flex h-full min-h-[85px] w-full flex-col items-center justify-center gap-2 transition-colors",
            songCupMuted,
            "hover:text-foreground dark:hover:text-white",
          )}
          aria-label="Create a post"
        >
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border", songCupBorderAccent)}>
            <Plus className="h-5 w-5" />
          </div>
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {!canWrite && (
            <p className={cn("text-xs", songCupMuted)}>
              {needsOrbReauth
                ? "Your Orb session expired partially — sign in again with Orb to post."
                : "Connect wallet, sign in with Orb, and link your profile to post to this feed."}
            </p>
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with Songchain…"
            rows={3}
            disabled={isPosting}
            maxLength={5000}
            autoFocus={focused}
            onBlur={() => {
              if (!hasContent) setFocused(false);
            }}
            className="border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:placeholder:text-white/40"
          />

          {!canWrite ? (
            <Button type="button" variant="outline" size="sm" onClick={promptWriteAccess} className="w-fit">
              {needsOrbReauth ? "Sign in again" : "Link Orb to post"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isPosting || !canSubmit}
              onClick={() => void handleSubmit()}
              className="ml-auto rounded-full bg-gradient-to-br from-[#DC2BB3] to-[#FDBE01] px-5 font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              POST
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
