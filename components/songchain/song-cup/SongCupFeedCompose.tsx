"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSongchainPost } from "@/hooks/useSongchainPost";
import { useCreatorLiveStream } from "@/hooks/useCreatorLiveStream";
import { useUser } from "@/lib/wallet/react";
import { GroveVideoUploader } from "@/components/songchain/GroveVideoUploader";
import { songCupSubmissionsService } from "@/lib/sdk/supabase/song-cup-submissions";
import type { SongchainCreatedPost } from "@/lib/songchain/feed-types";
import type { VideoAsset } from "@/lib/types/video-asset";
import type { StreamSummary } from "@/lib/songchain/build-lens-livestream-metadata";
import { toast } from "sonner";

type SongCupFeedComposeProps = {
  feedId: string | null;
  onPosted?: (created: SongchainCreatedPost) => void;
  /** Pre-fill live stream attach (e.g. from /live page modal). */
  initialLiveStream?: StreamSummary | null;
};

export function SongCupFeedCompose({
  feedId,
  onPosted,
  initialLiveStream = null,
}: SongCupFeedComposeProps) {
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);
  const [uploadedVideoAsset, setUploadedVideoAsset] = useState<Partial<VideoAsset> | null>(null);
  const [attachedLiveStream, setAttachedLiveStream] = useState<StreamSummary | null>(
    initialLiveStream?.is_live ? initialLiveStream : null,
  );

  const { createPost, isPosting, canWrite, needsOrbReauth, promptWriteAccess } =
    useSongchainPost();
  const { stream, isLive, loading: streamLoading } = useCreatorLiveStream();
  const user = useUser();

  if (!feedId) return null;

  const liveAttached = !!attachedLiveStream?.is_live;
  const hasContent = content.trim().length > 0 || !!uploadedVideoAsset || liveAttached;
  const canSubmit = hasContent;

  const handleAttachLive = () => {
    if (stream?.is_live) {
      setAttachedLiveStream(stream);
      setUploadedVideoAsset(null);
    }
  };

  const handleUploadVideo = (asset: Partial<VideoAsset>) => {
    setUploadedVideoAsset(asset);
    if (asset) setAttachedLiveStream(null);
  };

  const handleRemoveVideo = () => {
    setUploadedVideoAsset(null);
  };

  const handleSubmit = async () => {
    const created = await createPost({
      content,
      feedId,
      attachedVideo: liveAttached ? null : (uploadedVideoAsset as VideoAsset | null),
      attachedLiveStream: liveAttached ? attachedLiveStream : null,
    });
    if (created) {
      if (uploadedVideoAsset?.location && user?.address) {
        try {
          await songCupSubmissionsService.create({
            wallet_address: user.address,
            grove_url: uploadedVideoAsset.location,
            grove_hash: uploadedVideoAsset.metadata_uri ?? undefined,
            title: uploadedVideoAsset.title ?? undefined,
            description: content.trim() || undefined,
            post_id: created.postId,
          });
        } catch (err) {
          console.error("Song Cup submission sync failed", err);
          toast.error("Post shared, but submission backup failed.");
        }
      }
      setContent("");
      setUploadedVideoAsset(null);
      setAttachedLiveStream(null);
      setFocused(false);
      onPosted?.(created);
    }
  };

  const showExpanded = focused || hasContent;

  return (
    <div className="relative min-h-[117px] rounded-[20px] border border-[#fe01dc] bg-black/60 p-4">
      {!showExpanded ? (
        <button
          type="button"
          onClick={() => setFocused(true)}
          className="flex h-full min-h-[85px] w-full flex-col items-center justify-center gap-2 text-white/60 transition-colors hover:text-white"
          aria-label="Create a post"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#fe01dc]/40">
            <Plus className="h-5 w-5" />
          </div>
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {!canWrite && (
            <p className="text-xs text-white/70">
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
            className="border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {isLive && !liveAttached && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={streamLoading || isPosting}
              onClick={handleAttachLive}
              className="w-fit gap-2 border-[#fe01dc]/40 text-[#fe01dc] hover:bg-[#fe01dc]/10 hover:text-white"
            >
              Attach your live stream
            </Button>
          )}

          {liveAttached && attachedLiveStream && (
            <div className="flex items-center gap-3 rounded-md border border-[#fe01dc]/30 bg-black/40 p-3">
              <span className="rounded bg-gradient-to-br from-[#DC2BB3] to-[#FDBE01] px-1.5 py-0.5 text-[10px] font-bold text-black">
                LIVE
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {attachedLiveStream.name || "Live on Creative TV"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/10"
                onClick={() => setAttachedLiveStream(null)}
                aria-label="Detach live stream"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!liveAttached && (
            <GroveVideoUploader
              onUploaded={handleUploadVideo}
              onRemove={handleRemoveVideo}
              uploadedAsset={uploadedVideoAsset}
              disabled={isPosting}
            />
          )}

          {!canWrite ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={promptWriteAccess}
              className="w-fit border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
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
