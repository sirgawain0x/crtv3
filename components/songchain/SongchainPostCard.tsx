"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  addReaction,
  undoReaction,
  editPost,
  deletePost,
  bookmarkPost,
  undoBookmarkPost,
  repost,
  post as createLensPost,
  fetchPostReferences,
} from "@lens-protocol/client/actions";
import { evmAddress, postId, uri, PostReferenceType } from "@lens-protocol/client";
import { textOnly } from "@lens-protocol/metadata";
import type { AnyPost } from "@lens-protocol/graphql";
import {
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  Bookmark,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveOrbMediaUrl } from "@/lib/sdk/orb/media";
import { publicClient } from "@/lib/sdk/lens/client";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { groveService } from "@/lib/sdk/grove/service";
import { clearStaleOrbSessionIfNeeded } from "@/lib/sdk/orb/session-errors";
import { SongchainAuthorTimeline } from "@/components/songchain/SongchainAuthorTimeline";
import { SongchainFollowButton } from "@/components/songchain/SongchainGraphPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";

function resolvePost(post: AnyPost): AnyPost | null {
  if (post.__typename === "Repost") {
    return post.repostOf ?? null;
  }
  return post;
}

function postText(post: AnyPost): string {
  const resolved = resolvePost(post);
  if (!resolved || !("metadata" in resolved) || !resolved.metadata) return "";
  const meta = resolved.metadata;
  if ("content" in meta && typeof meta.content === "string") return meta.content;
  if ("title" in meta && typeof meta.title === "string") return meta.title;
  return "";
}

function postImage(post: AnyPost): string | null {
  const resolved = resolvePost(post);
  if (!resolved || !("metadata" in resolved) || !resolved.metadata) return null;
  const meta = resolved.metadata;
  if ("image" in meta && meta.image?.item) {
    return resolveOrbMediaUrl(String(meta.image.item));
  }
  if ("video" in meta && meta.video?.cover) {
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
  feedId?: string | null;
  graphId?: string | null;
  compact?: boolean;
  onReactionChange?: () => void;
};

export function SongchainPostCard({
  post,
  feedId,
  graphId = null,
  compact = false,
  onReactionChange,
}: SongchainPostCardProps) {
  const { canWrite, getSessionClient, promptWriteAccess, lensAccount } =
    useLensOrbWrite();
  const [pending, setPending] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<AnyPost[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const content = resolvePost(post);
  const ops =
    content != null && "operations" in content ? content.operations : null;
  const hasReacted =
    ops != null && "hasReacted" in ops && ops.hasReacted === true;
  const [upvoted, setUpvoted] = useState(hasReacted);
  const imageUrl = postImage(post);
  const reactions =
    content != null && "stats" in content ? (content.stats?.upvotes ?? 0) : 0;
  const isOwner =
    !!lensAccount &&
    !!content &&
    content.author.address.toLowerCase() === lensAccount.toLowerCase();

  useEffect(() => {
    setUpvoted(hasReacted);
  }, [hasReacted, content?.id]);

  useEffect(() => {
    if (ops && "hasBookmarked" in ops) {
      setBookmarked(Boolean(ops.hasBookmarked));
    }
  }, [ops, content?.id]);

  const loadComments = useCallback(async () => {
    if (!content) return;
    try {
      const result = await fetchPostReferences(publicClient, {
        referencedPost: postId(content.id),
        referenceTypes: [PostReferenceType.CommentOn],
      });
      if (result.isOk()) setComments([...result.value.items]);
    } catch {
      // Non-fatal
    }
  }, [content]);

  useEffect(() => {
    if (showComments) void loadComments();
  }, [showComments, loadComments]);

  if (!content) return null;

  const withWrite = async (
    action: string,
    fn: () => Promise<void>,
  ) => {
    if (!canWrite) {
      promptWriteAccess();
      return;
    }
    setPending(action);
    try {
      await fn();
      onReactionChange?.();
    } catch (err) {
      clearStaleOrbSessionIfNeeded(err);
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending(null);
    }
  };

  const toggleUpvote = () =>
    void withWrite("upvote", async () => {
      const client = await getSessionClient();
      const id = postId(content.id);
      const result = upvoted
        ? await undoReaction(client, { post: id, reaction: "UPVOTE" })
        : await addReaction(client, { post: id, reaction: "UPVOTE" });
      if (result.isErr()) throw new Error(result.error.message);
      setUpvoted(!upvoted);
    });

  const toggleBookmark = () =>
    void withWrite("bookmark", async () => {
      const client = await getSessionClient();
      const id = postId(content.id);
      const result = bookmarked
        ? await undoBookmarkPost(client, { post: id })
        : await bookmarkPost(client, { post: id });
      if (result.isErr()) throw new Error(result.error.message);
      setBookmarked(!bookmarked);
      toast.success(bookmarked ? "Removed bookmark" : "Saved to bookmarks");
    });

  const handleRepost = () =>
    void withWrite("repost", async () => {
      const client = await getSessionClient();
      const result = await repost(client, {
        post: postId(content.id),
        ...(feedId ? { feed: evmAddress(feedId) } : {}),
      });
      if (result.isErr()) throw new Error(result.error.message);
      toast.success("Reposted");
    });

  const submitComment = () =>
    void withWrite("comment", async () => {
      const trimmed = commentText.trim();
      if (!trimmed) return;
      const client = await getSessionClient();
      const metadata = textOnly({ content: trimmed, locale: "en" });
      const upload = await groveService.uploadJson(metadata);
      if (!upload.success || !upload.url) {
        throw new Error("Failed to upload comment metadata");
      }
      const result = await createLensPost(client, {
        contentUri: uri(upload.url),
        commentOn: { post: postId(content.id) },
        ...(feedId ? { feed: evmAddress(feedId) } : {}),
      });
      if (result.isErr()) throw new Error(result.error.message);
      setCommentText("");
      toast.success("Comment posted");
      void loadComments();
    });

  const submitEdit = () =>
    void withWrite("edit", async () => {
      const trimmed = editText.trim();
      if (!trimmed) return;
      const client = await getSessionClient();
      const metadata = textOnly({ content: trimmed, locale: "en" });
      const upload = await groveService.uploadJson(metadata);
      if (!upload.success || !upload.url) {
        throw new Error("Failed to upload edit metadata");
      }
      const result = await editPost(client, {
        post: postId(content.id),
        contentUri: uri(upload.url),
      });
      if (result.isErr()) throw new Error(result.error.message);
      setEditOpen(false);
      toast.success("Post updated");
    });

  const handleDelete = () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    void withWrite("delete", async () => {
      const client = await getSessionClient();
      const result = await deletePost(client, { post: postId(content.id) });
      if (result.isErr()) throw new Error(result.error.message);
      toast.success("Post deleted");
    });
  };

  return (
    <>
      <article
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm",
          compact && "text-sm",
        )}
      >
        {imageUrl && !compact && (
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
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs text-muted-foreground text-left hover:text-violet-400 w-fit"
              onClick={() => setTimelineOpen(true)}
            >
              {authorLabel(post)}
            </button>
            {content && (
              <SongchainFollowButton
                graphId={graphId}
                accountAddress={content.author.address}
              />
            )}
          </div>
          {postText(post) && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {postText(post)}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-1 pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground mr-auto">
              {reactions} upvote{reactions === 1 ? "" : "s"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending === "upvote"}
              onClick={toggleUpvote}
              className={cn(upvoted && "text-rose-500")}
              aria-label="Upvote"
            >
              {pending === "upvote" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={cn("h-4 w-4", upvoted && "fill-current")} />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowComments((v) => !v)}
              aria-label="Comments"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending === "repost"}
              onClick={handleRepost}
              aria-label="Repost"
            >
              {pending === "repost" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Repeat2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending === "bookmark"}
              onClick={toggleBookmark}
              className={cn(bookmarked && "text-amber-500")}
              aria-label="Bookmark"
            >
              {pending === "bookmark" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
              )}
            </Button>
            {isOwner && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditText(postText(post));
                    setEditOpen(true);
                  }}
                  aria-label="Edit post"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending === "delete"}
                  onClick={handleDelete}
                  className="text-destructive"
                  aria-label="Delete post"
                >
                  {pending === "delete" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>

          {showComments && (
            <div className="space-y-2 border-t border-border/30 pt-3">
              {comments.length > 0 && (
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded bg-muted/40 p-2">
                      <span className="font-medium">{authorLabel(c)}: </span>
                      {postText(c)}
                    </li>
                  ))}
                </ul>
              )}
              {canWrite ? (
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    rows={2}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={pending === "comment" || !commentText.trim()}
                    onClick={submitComment}
                  >
                    Post
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={promptWriteAccess}>
                  Link Orb to comment
                </Button>
              )}
            </div>
          )}
        </div>
      </article>

      <SongchainAuthorTimeline
        authorAddress={content.author.address}
        authorLabel={authorLabel(post)}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending === "edit" || !editText.trim()}
              onClick={submitEdit}
            >
              {pending === "edit" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
