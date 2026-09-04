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
          "spindrift-banner-mobile bg-[#f5f9f6] md:hidden",
        )}
      >
        <div className={channelBannerContentClassName}>
          <div className="relative aspect-[1024/173] w-[min(78vw,720px)] max-w-full">
            <Image
              src="/spindrift/spindrift-banner-mobile.svg"
              alt="Spindrift × Creative TV"
              fill
              className="object-contain object-center"
              priority
              unoptimized
              sizes="78vw"
            />
          </div>

          {showButton ? (
            <SongCupGoalButton
              href={href}
              label={buttonLabel}
              className="animate-songcup-pulse hover:animate-none"
            />
          ) : (
            <span
              className="invisible inline-flex w-[clamp(120px,38vw,330px)]"
              aria-hidden
            >
              <span className="aspect-[296/129] w-full" />
            </span>
          )}
        </div>
      </div>

      <div
        className={channelBannerShell(
          "spindrift-banner-desktop hidden aspect-[1024/274] bg-[#f5f9f6] py-0 md:block",
        )}
      >
        <Image
          src="/spindrift/spindrift-channel-banner.svg"
          alt="Spindrift × Creative TV"
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
    </div>
  );
}
