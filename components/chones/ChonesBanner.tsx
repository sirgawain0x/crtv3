"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import {
  channelBannerContentClassName,
  channelBannerShell,
} from "@/lib/banners/channel-banner-shell";
import { cn } from "@/lib/utils";

type ChonesBannerProps = {
  showButton?: boolean;
  buttonLabel?: string;
  href?: string;
  className?: string;
};

export function ChonesBanner({
  showButton = true,
  buttonLabel = "ENTER",
  href = "/chones",
  className,
}: ChonesBannerProps) {
  return (
    <div className={cn(channelBannerShell("bg-[#F5F0E8]"), className)}>
      <div className={channelBannerContentClassName}>
        {/* Match SongCupBrandLogo footprint so banner height stays in lockstep */}
        <div className="relative aspect-[1024/173] w-[min(78vw,720px)] max-w-full lg:w-[min(82vw,720px)]">
          <Image
            src="/chones/chones-banner.png"
            alt="Chones"
            fill
            className="object-contain object-center"
            priority
            sizes="(max-width: 1280px) 78vw, 720px"
          />
        </div>

        {/* Invisible spacer matching Song Cup tagline line so mobile heights match */}
        <p
          className="invisible max-w-full text-balance text-center text-[clamp(10px,3.2vw,32px)] font-bold uppercase leading-tight tracking-[0.02em] lg:max-w-[95%] lg:leading-none lg:whitespace-nowrap"
          aria-hidden
        >
          PREDICT YOUR WINNER. GUESS YOUR SONG
        </p>

        {showButton ? (
          <SongCupGoalButton
            href={href}
            label={buttonLabel}
            className="animate-songcup-pulse hover:animate-none"
          />
        ) : (
          /* Keep vertical rhythm when ENTER is hidden (e.g. /chones page) */
          <span
            className="invisible inline-flex w-[clamp(120px,38vw,330px)]"
            aria-hidden
          >
            <span className="aspect-[296/129] w-full" />
          </span>
        )}
      </div>
    </div>
  );
}
