"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
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
    <div
      className={cn(
        "relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl bg-[#F5F0E8] py-5 lg:aspect-[1024/274] lg:py-0",
        className,
      )}
    >
      {/* Desktop: full-bleed cream banner */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <Image
          src="/chones/chones-banner.png"
          alt="Chones"
          fill
          className="object-cover object-center"
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
        />
      </div>

      {/* Mobile: centered logo + optional ENTER (Song Cup rhythm) */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2 px-3 lg:hidden">
        <div className="relative h-[72px] w-full max-w-[280px] sm:h-[88px] sm:max-w-[360px]">
          <Image
            src="/chones/chones-banner.png"
            alt="Chones"
            fill
            className="object-contain object-center"
            priority
            sizes="(max-width: 640px) 280px, 360px"
          />
        </div>
        {showButton && (
          <SongCupGoalButton
            href={href}
            label={buttonLabel}
            className="animate-songcup-pulse hover:animate-none"
          />
        )}
      </div>

      {/* Desktop: ENTER overlaid, nudged left + slightly down */}
      {showButton && (
        <div className="absolute inset-0 z-10 hidden items-center justify-end pr-12 lg:flex">
          <SongCupGoalButton
            href={href}
            label={buttonLabel}
            className="translate-y-2 animate-songcup-pulse hover:animate-none"
          />
        </div>
      )}
    </div>
  );
}
