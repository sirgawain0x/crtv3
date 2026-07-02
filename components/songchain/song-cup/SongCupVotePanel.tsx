"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useUser } from "@/lib/wallet/react";
import { useSongCupAdmin } from "@/lib/hooks/song-cup/useSongCupAdmin";
import {
  useSongCupMatchups,
  type SongCupMatchupFilter,
} from "@/lib/hooks/song-cup/useSongCupMatchups";
import { SongCupVoteMatchupCard } from "./SongCupVoteMatchupCard";
import { SongCupAdminMatchupForm } from "./SongCupAdminMatchupForm";
import { SongCupAdminSubmissionsList } from "./SongCupAdminSubmissionsList";
import {
  SongCupVoteContentWell,
  SongCupVoteCornerOrnament,
  SongCupVoteFilterPill,
  SongCupVoteGradientGlow,
  SongCupVoteLogoBanner,
  SongCupVoteTitle,
} from "./vote/SongCupVoteUi";
import { cn } from "@/lib/utils/utils";
import { songCupMuted } from "@/lib/songchain/song-cup/panel-styles";

const FILTERS: { id: SongCupMatchupFilter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

type SongCupVotePanelProps = {
  className?: string;
};

export function SongCupVotePanel({ className }: SongCupVotePanelProps) {
  const user = useUser();
  const { isAdmin } = useSongCupAdmin();
  const [filter, setFilter] = useState<SongCupMatchupFilter>("upcoming");

  const {
    matchups,
    isLoading,
    error,
    castVote,
    createMatchup,
    updateMatchupStatus,
    removeMatchup,
  } = useSongCupMatchups(user?.address ?? null, filter);

  const activeMatchups =
    filter === "upcoming"
      ? matchups.filter((m) => m.status === "upcoming" || m.status === "active")
      : matchups;

  return (
    <SongCupVoteContentWell className={className}>
      <SongCupVoteCornerOrnament position="top-left" />
      <SongCupVoteCornerOrnament position="bottom-right" />

      <SongCupVoteGradientGlow className="-left-20 top-0 h-[275px] w-[353px] sm:h-[413px] sm:w-[529px]" />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <img
              src="/songchain/button-icons/vote-icon.svg"
              alt=""
              aria-hidden
              className="hidden h-[120px] w-[120px] object-contain lg:block"
            />
            <SongCupVoteTitle />
          </div>
          <SongCupVoteLogoBanner className="hidden sm:block" />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label }) => (
            <SongCupVoteFilterPill
              key={id}
              label={label}
              active={filter === id}
              onClick={() => setFilter(id)}
              className={cn(
                id === "upcoming" && "min-w-[182px] justify-end pr-[6px]",
                id === "past" && "min-w-[103px]",
                id === "all" && "min-w-[76px]",
              )}
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {isLoading && (
          <div className={cn("flex h-40 items-center justify-center gap-2", songCupMuted)}>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading matchups…
          </div>
        )}

        {!isLoading && activeMatchups.length === 0 && (
          <div className="rounded-[20px] bg-muted/50 px-6 py-12 text-center dark:bg-white/[0.08]">
            <p className={cn("text-sm", songCupMuted)}>
              No matchups in this view yet. Check back when the battle stage opens.
            </p>
          </div>
        )}

        {!isLoading && activeMatchups.length > 0 && (
          <div className="flex flex-col gap-6">
            {activeMatchups.map((matchup) => (
              <SongCupVoteMatchupCard
                key={matchup.id}
                matchup={matchup}
                walletConnected={Boolean(user?.address)}
                onVote={(choice) => castVote(matchup.id, choice)}
              />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-4 flex flex-col gap-6 border-t border-[#dc2bb3]/30 pt-6">
            <SongCupAdminMatchupForm
              matchups={matchups}
              onCreate={createMatchup}
              onUpdateStatus={updateMatchupStatus}
              onRemove={removeMatchup}
            />
            <SongCupAdminSubmissionsList compact />
          </div>
        )}
      </div>
    </SongCupVoteContentWell>
  );
}
