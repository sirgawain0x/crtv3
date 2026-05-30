"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  addReaction,
  undoReaction,
} from "@lens-protocol/client/actions";
import { postId } from "@lens-protocol/types";
import type { AnyPost } from "@lens-protocol/graphql";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveOrbMediaUrl } from "@/lib/sdk/orb/media";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";

/** Lens feed items may be reposts; read metadata from the underlying post. */
function resolvePost(post: AnyPost) {
  return post.__typename === "Repost" ? post.repostOf : post;
}

function postText(post: AnyPost): string {
  const meta = resolvePost(post).metadata;
  if (!meta) return '';
  if ('content' in meta && typeof meta.content === 'string') return meta.content;
  if ('title' in meta && typeof meta.title === 'string') return meta.title;
  return '';
}

function postImage(post: AnyPost): string | null {
  const meta = resolvePost(post).metadata;
  if (!meta) return null;
  if ('image' in meta && meta.image?.item) {
    return resolveOrbMediaUrl(String(meta.image.item));
  }
  if ('video' in meta && meta.video?.cover) {
    return resolveOrbMediaUrl(String(meta.video.cover));
  }
  return null;
}

function authorLabel(post: AnyPost): string {
  const author = post.author;
  if (author.username?.localName) return `@${author.username.localName}`;
  return `${author.address.slice(0, 6)}…${author.address.slice(-4)}`;
}

type SongchainPostCardProps = {
  post: AnyPost;
  onReactionChange?: () => void;
};

export function SongchainPostCard({ post, onReactionChange }: SongchainPostCardProps) {
  const { canWrite, getSessionClient, promptWriteAccess } = useLensOrbWrite();
  const [pending, setPending] = useState(false);
  const content = resolvePost(post);
  const ops = "operations" in content ? content.operations : null;
  const hasReacted =
    ops != null && 'hasReacted' in ops && ops.hasReacted === true;
  const [upvoted, setUpvoted] = useState(hasReacted);

  useEffect(() => {
    setUpvoted(hasReacted);
  }, [hasReacted, post.id]);
  const imageUrl = postImage(post);
  const reactions = content.stats?.upvotes ?? 0;

  const toggleUpvote = async () => {
    if (!canWrite) {
      promptWriteAccess();
      toast.info('Link your Orb account to like posts on Lens');
      return;
    }

    setPending(true);
    try {
      const client = await getSessionClient();
      const id = postId(post.id);
      const result = upvoted
        ? await undoReaction(client, { post: id, reaction: 'UPVOTE' })
        : await addReaction(client, { post: id, reaction: 'UPVOTE' });

      if (result.isErr()) {
        throw new Error(result.error.message);
      }
      setUpvoted(!upvoted);
      onReactionChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reaction failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      {imageUrl && (
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">{authorLabel(post)}</p>
        {postText(post) && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{postText(post)}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground">
            {reactions} upvote{reactions === 1 ? '' : 's'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void toggleUpvote()}
            className={cn(upvoted && 'text-rose-500 hover:text-rose-600')}
            aria-pressed={upvoted}
            aria-label={upvoted ? 'Remove upvote' : 'Upvote post'}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={cn('h-4 w-4', upvoted && 'fill-current')} />
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
