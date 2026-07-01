"use client";

import { useSongchainGroupMembership } from "@/hooks/useSongchainGroupMembership";
import { SongchainFeedSection } from "@/components/songchain/SongchainFeedSection";
import { SongCupFeedCompose } from "./SongCupFeedCompose";
import { SongCupFeedMembersRow } from "./SongCupFeedMembersRow";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { SONG_CUP_PLAY_LINKS } from "@/lib/songchain/events";

type SongCupFeedPanelProps = {
  feedId: string | null;
  groupId: string | null;
  graphId: string | null;
  feedTitle?: string;
  feedDescription?: string;
  orbClubUrl?: string;
};

export function SongCupFeedPanel({
  feedId,
  groupId,
  graphId,
  feedTitle = "Song Cup club feed",
  feedDescription = "Read the member feed. Join the club on Orb to post and react.",
  orbClubUrl,
}: SongCupFeedPanelProps) {
  const membership = useSongchainGroupMembership({ groupId });

  const joinHref = orbClubUrl ?? SONG_CUP_PLAY_LINKS.club;

  return (
    <div className="rounded-[20px] border border-[#dc2bb3] bg-black p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Feed icon + gate copy column */}
        <aside className="flex shrink-0 flex-col items-start gap-3 sm:w-[147px]">
          <img
            src="/songchain/button-icons/feed-icon.svg"
            alt="The Feed"
            className="h-[120px] w-[120px] object-contain"
          />
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-white">
              FOR ORB MEMBERS ONLY
            </p>
            {membership.isMember ? (
              <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-white/70">
                Joined
              </p>
            ) : (
              <a
                href={joinHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (membership.canWrite) {
                    e.preventDefault();
                    void membership.join();
                  }
                }}
                className={cn(
                  "block text-[10px] font-semibold uppercase leading-tight tracking-wide text-white hover:text-[#fe01dc]",
                  membership.joining && "pointer-events-none opacity-60",
                )}
              >
                {membership.joining ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Joining…
                  </span>
                ) : (
                  "JOIN ORB SONG CLUB"
                )}
              </a>
            )}
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-1 flex-col gap-4">
          {membership.loading && (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking club membership…
            </div>
          )}

          {!membership.loading && (
            <>
              {membership.isMember && <SongCupFeedCompose feedId={feedId} />}

              <SongCupFeedMembersRow groupId={groupId} orbClubUrl={joinHref} />

              <SongchainFeedSection
                title={feedTitle}
                description={feedDescription}
                feedId={feedId}
                graphId={graphId}
                emptyDescription="Lens custom feeds only show posts published to that feed contract. Existing Orb profile or global posts are not backfilled."
                layout="grid"
                hideHeader
                readOnly={!membership.isMember}
                cardVariant="song-cup"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
