"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import {
  channelBannerContentClassName,
  channelBannerShell,
} from "@/lib/banners/channel-banner-shell";
import { SONG_CUP_PLAY_LINKS } from "@/lib/songchain/events";
import { cn } from "@/lib/utils";

type BeatMeBannerProps = {
  showButton?: boolean;
  buttonLabel?: string;
  href?: string;
  className?: string;
};

export function BeatMeBanner({
  showButton = true,
  buttonLabel = "PLAY",
  href = SONG_CUP_PLAY_LINKS.beat,
  className,
}: BeatMeBannerProps) {
  return (
    <div className={cn(channelBannerShell("bg-black"), className)}>
      {/* Mobile: content-driven height via native image aspect + shell py-5 */}
      <div className="relative aspect-[1080/566] w-full lg:hidden">
        <Image
          src="/banners/BEAT_ME_thumbnail.png"
          alt="Beat Me — interactive guess that tune. Beat Me and win USDC."
          fill
          className="rounded-lg object-cover object-center"
          sizes="100vw"
          priority
        />
      </div>

      {/* Desktop: fill shared 1024/274 shell */}
      <Image
        src="/banners/BEAT_ME_thumbnail.png"
        alt="Beat Me — interactive guess that tune. Beat Me and win USDC."
        fill
        className="hidden object-cover object-center lg:block"
        sizes="(max-width: 1280px) 100vw, 1280px"
        priority
      />

      {showButton ? (
        <div
          className={cn(
            channelBannerContentClassName,
            "lg:absolute lg:inset-0 lg:justify-end lg:pb-5",
          )}
        >
          <SongCupGoalButton
            href={href}
            label={buttonLabel}
            className="animate-songcup-pulse hover:animate-none"
          />
        </div>
      ) : null}
    </div>
  );
}
