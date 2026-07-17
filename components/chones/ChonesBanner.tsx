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
    <div
      className={cn(
        channelBannerShell("aspect-[1024/274] bg-[#f0e6da] py-0"),
        className,
      )}
    >
      <Image
        src="/chones/chonescreativechannelbanner.svg"
        alt="Chones"
        fill
        className="object-cover object-center"
        priority
        unoptimized
        sizes="(max-width: 1280px) 100vw, 1280px"
      />

      {showButton ? (
        <div
          className={cn(
            channelBannerContentClassName,
            "justify-end pb-4 lg:pb-6",
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
