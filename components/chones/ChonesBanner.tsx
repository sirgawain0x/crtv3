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
        "relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl bg-black min-h-[140px] lg:aspect-[1024/274] lg:min-h-0",
        className,
      )}
    >
      <Image
        src="/chones/chones-banner.png"
        alt="Chones"
        fill
        className="object-cover object-left"
        priority
        sizes="(max-width: 1280px) 100vw, 1280px"
      />
      {showButton && (
        <div className="absolute inset-0 z-10 flex items-end justify-end p-4 sm:items-center sm:justify-end sm:pr-8 sm:pb-0">
          <SongCupGoalButton
            href={href}
            label={buttonLabel}
            className="animate-songcup-pulse hover:animate-none"
          />
        </div>
      )}
    </div>
  );
}
