"use client";

import { useState, useRef } from "react";
import { Plus, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SongchainFeedSection,
  type SongchainFeedHandle,
} from "@/components/songchain/SongchainFeedSection";
import { SongchainClubGate } from "@/components/songchain/SongchainClubGate";
import { CreativeTVVideoPicker } from "@/components/songchain/CreativeTVVideoPicker";
import { useSongchainPost } from "@/hooks/useSongchainPost";
import { useCreatorVideoLibrary } from "@/hooks/useCreatorVideoLibrary";
import { useCreatorLiveStream } from "@/hooks/useCreatorLiveStream";
import { useSongchainGroupMembership } from "@/hooks/useSongchainGroupMembership";
import { useSongCupGroupMembers } from "@/hooks/useSongCupGroupMembers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SongchainCreatedPost } from "@/lib/songchain/feed-types";
import type { VideoAsset } from "@/lib/types/video-asset";
import type { StreamSummary } from "@/lib/songchain/build-lens-livestream-metadata";
import { cn } from "@/lib/utils";

/** Badge that looks like the screenshot’s "THE FEED" chain emblem.
 *  Swap the SVG emblem for the attached feed-icon.svg when available. */
function FeedBadge() {
  return (
    <div className="relative flex items-center gap-3 rounded-xl border-2 border-fuchsia-500 bg-black px-4 py-3 shadow-[0_0_18px_rgba(253,0,215,0.25)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-fuchsia-400 bg-fuchsia-950">
        {/** Placeholder for feed-icon.svg — a chain link / circle emblem */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#FD00D7" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="#FD00D7" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-black uppercase italic tracking-wider text-white">THE FEED</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fuchsia-300">
          For crew members only &gt;
        </span>
      </div>
    </div>
  );
}

function MemberAvatarStrip({ groupId }: { groupId: string | null }) {
  const { members, loading } = useSongCupGroupMembers(groupId);

  if (loading && members.length === 0) return null;
  if (members.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex -space-x-2.5 overflow-hidden pl-1">
        {members.slice(0, 8).map((member, i) => (
          <div key={member.address} className="relative">
            <Avatar
              className={cn(
                "h-9 w-9 border-2 border-black ring-1 ring-fuchsia-500/50",
                i === 0 && "z-10",
              )}
            >
              <AvatarFallback className="bg-gradient-to-br from-fuchsia-600 to-violet-700 text-[10px] font-bold text-white">
                {member.username
                  ? member.username.slice(0, 2).toUpperCase()
                  : member.address.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-fuchsia-400">▼</span>
          </div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{members.length} active</span>
    </div>
  );
}

function SongCupComposeBox({
  feedId,
  enabled,
  onPosted,
}: {
  feedId: string | null;
  enabled: boolean;
  onPosted?: (created: SongchainCreatedPost) => void;
}) {
  const [content, setContent] = useState("");
  const [attachedVideo, setAttachedVideo] = useState<VideoAsset | null>(null);
  const [attachedLiveStream, setAttachedLiveStream] = useState<StreamSummary | null>(null);

  const { createPost, isPosting, canWrite, needsOrbReauth, promptWriteAccess } =
    useSongchainPost();
  const { videos, loading: videosLoading, hasWallet } = useCreatorVideoLibrary();
  const { stream, isLive, loading: streamLoading } = useCreatorLiveStream();

  if (!feedId) return null;

  const liveAttached = !!attachedLiveStream?.is_live;
  const canSubmit =
    enabled && (content.trim().length > 0 || !!attachedVideo || liveAttached);

  const handleAttachLive = () => {
    if (stream?.is_live) {
      setAttachedLiveStream(stream);
      setAttachedVideo(null);
    }
  };

  const handleSubmit = async () => {
    const created = await createPost({
      content,
      feedId,
      attachedVideo: liveAttached ? null : attachedVideo,
      attachedLiveStream: liveAttached ? attachedLiveStream : null,
    });
    if (created) {
      setContent("");
      setAttachedVideo(null);
      setAttachedLiveStream(null);
      onPosted?.(created);
    }
  };

  return (
    <div className="rounded-xl border-2 border-fuchsia-500/70 bg-black p-4 shadow-[0_0_24px_rgba(253,0,215,0.15)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-fuchsia-300">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full border border-fuchsia-500/40 hover:bg-fuchsia-500/10"
            disabled={!enabled || isPosting}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {isLive && !liveAttached && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={streamLoading || isPosting || !enabled}
              onClick={handleAttachLive}
              className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-950/20"
            >
              <Radio className="h-3 w-3" />
              Live
            </Button>
          )}
        </div>

        {!canWrite ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={promptWriteAccess}
            className="border-amber-500/40 text-amber-300"
          >
            {needsOrbReauth ? "Sign in again" : "Link Orb to post"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || isPosting}
            onClick={() => void handleSubmit()}
            className="bg-gradient-to-r from-fuchsia-600 to-amber-400 px-6 font-bold text-black hover:opacity-90"
          >
            {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            POST
          </Button>
        )}
      </div>

      {!canWrite && (
        <p className="mb-2 text-xs text-muted-foreground">
          {needsOrbReauth
            ? "Your Orb session needs a fresh sign-in before you can post."
            : "Connect wallet, sign in with Orb, and link your profile to post."}
        </p>
      )}

      {!liveAttached && (
        <CreativeTVVideoPicker
          videos={videos}
          loading={videosLoading}
          selected={attachedVideo}
          onSelect={(video) => {
            setAttachedVideo(video);
            if (video) setAttachedLiveStream(null);
          }}
          disabled={!hasWallet || !enabled}
        />
      )}

      {liveAttached && attachedLiveStream && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs">
          <span className="rounded bg-red-600 px-1 py-0.5 font-bold text-white">LIVE</span>
          <span className="truncate">{attachedLiveStream.name || "Live on Creative TV"}</span>
        </div>
      )}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={enabled ? "Share something with the crew…" : "Join the club to post"}
        rows={2}
        disabled={isPosting || !enabled}
        maxLength={5000}
        className="border-fuchsia-500/30 bg-black text-white placeholder:text-muted-foreground focus-visible:ring-fuchsia-500"
      />
    </div>
  );
}

type SongCupFeedCardProps = {
  config: {
    enabled: boolean;
    groupId: string | null;
    graphId: string | null;
  };
  feedId: string | null;
  publicFeedTitle?: string;
  publicFeedDescription?: string;
  clubGateTitle?: string;
  clubGateDescription?: string;
  orbClubUrl?: string;
  gateFeedBehindGroup?: boolean;
};

export function SongCupFeedCard({
  config,
  feedId,
  publicFeedTitle = "Song Cup club feed",
  publicFeedDescription = "Member-only posts — available after you join the club.",
  clubGateTitle,
  clubGateDescription,
  orbClubUrl,
  gateFeedBehindGroup = true,
}: SongCupFeedCardProps) {
  const feedRef = useRef<SongchainFeedHandle>(null);
  const membership = useSongchainGroupMembership({ groupId: config.groupId });
  const feedAccessible = !gateFeedBehindGroup || membership.isMember;

  const handlePosted = (created: SongchainCreatedPost) => {
    feedRef.current?.registerNewPost(created);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <FeedBadge />
        <div className="flex-1">
          <SongCupComposeBox
            feedId={feedId}
            enabled={feedAccessible}
            onPosted={handlePosted}
          />
        </div>
      </div>

      <MemberAvatarStrip groupId={config.groupId} />

      <SongchainClubGate
        membership={membership}
        title={clubGateTitle}
        description={clubGateDescription}
        orbClubUrl={orbClubUrl}
      />

      {feedAccessible && feedId ? (
        <SongchainFeedSection
          ref={feedRef}
          title={publicFeedTitle}
          description={publicFeedDescription}
          feedId={feedId}
          graphId={config.graphId}
          enabled={feedAccessible}
          onPostUpdated={() => feedRef.current?.reload()}
          emptyDescription="Lens custom feeds only show posts published to that feed contract. Existing Orb profile or global posts are not backfilled, so publish a new post directly to this feed if it should appear here."
        />
      ) : (
        <p className="text-center text-sm text-muted-foreground">Posts appear here after you join the club.</p>
      )}
    </section>
  );
}
