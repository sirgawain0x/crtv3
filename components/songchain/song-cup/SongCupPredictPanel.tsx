"use client";

import { Loader2 } from "lucide-react";
import { useSongCupOrbGames } from "@/lib/hooks/song-cup/useSongCupOrbGames";
import { formatDayGroupLabel } from "@/lib/songchain/song-cup/predict-format";
import { songCupMuted } from "@/lib/songchain/song-cup/panel-styles";
import { cn } from "@/lib/utils/utils";
import { SongCupPredictGameCard } from "./SongCupPredictGameCard";
import {
  SongCupPredictContentWell,
  SongCupPredictDateHeader,
  SongCupPredictEventHeader,
  SongCupPredictGradientGlow,
  SongCupPredictTitle,
} from "./predict/SongCupPredictUi";
import { SONG_CUP_PREDICT_ASSETS } from "@/lib/songchain/song-cup/predict-design";

type SongCupPredictPanelProps = {
  className?: string;
};

export function SongCupPredictPanel({ className }: SongCupPredictPanelProps) {
  const { event, dayGroups, isLoading, error } = useSongCupOrbGames();

  return (
    <SongCupPredictContentWell className={className}>
      <SongCupPredictGradientGlow className="-left-20 top-0 h-[275px] w-[353px] sm:h-[413px] sm:w-[529px]" />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <img
            src={SONG_CUP_PREDICT_ASSETS.predictIcon}
            alt=""
            aria-hidden
            className="hidden h-[120px] w-[120px] object-contain lg:block"
          />
          <SongCupPredictTitle />
        </div>

        {event ? <SongCupPredictEventHeader event={event} /> : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        {isLoading ? (
          <div className={cn("flex h-40 items-center justify-center gap-2", songCupMuted)}>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading games…
          </div>
        ) : dayGroups.length === 0 && !error ? (
          <div className="rounded-[20px] bg-muted/50 px-6 py-12 text-center dark:bg-white/[0.08]">
            <p className={cn("text-sm", songCupMuted)}>
              No games scheduled yet. Check back when the event opens.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {dayGroups.map((group) => (
              <section key={group.id} className="flex flex-col gap-3">
                <SongCupPredictDateHeader>
                  {formatDayGroupLabel(group.date, group.title)}
                </SongCupPredictDateHeader>
                <div className="flex flex-col gap-3">
                  {group.games.map((game) => (
                    <SongCupPredictGameCard key={game.id} game={game} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </SongCupPredictContentWell>
  );
}
