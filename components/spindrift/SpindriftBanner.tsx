"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import {
  channelBannerContentClassName,
  channelBannerShell,
} from "@/lib/banners/channel-banner-shell";
import { cn } from "@/lib/utils";

type SpindriftBannerProps = {
  showButton?: boolean;
  buttonLabel?: string;
  href?: string;
  className?: string;
};

export function SpindriftBanner({
  showButton = true,
  buttonLabel = "ENTER",
  href = "/spindrift",
  className,
}: SpindriftBannerProps) {
  return (
    <div className={cn("h-full w-full", className)}>
      <div
        className={channelBannerShell(
          "spindrift-banner-mobile relative overflow-hidden bg-[#1a0a2e] md:hidden",
        )}
      >
        <Image
          src="/spindrift/hero-pour.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          aria-hidden
        />
        <span className="sr-only">Spindrift × Creative TV</span>
        {showButton ? (
          <div
            className={cn(
              channelBannerContentClassName,
              "relative z-10 justify-end pb-4",
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

      <div
        className={channelBannerShell(
          "spindrift-banner-desktop relative hidden aspect-[1024/274] overflow-hidden bg-[#1a0a2e] py-0 md:block",
        )}
      >
        <Image
          src="/spindrift/hero-pour.png"
          alt="Spindrift × Creative TV — Grapeade pour"
          fill
          className="object-cover object-center"
          priority
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
    </div>
  );
}
