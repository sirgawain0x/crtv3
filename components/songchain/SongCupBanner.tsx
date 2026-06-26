"use client";

import { Montserrat_Alternates } from "next/font/google";
import Image from "next/image";
import { SongCupBrandLogo } from "@/components/songchain/song-cup/SongCupBrandLogo";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import { cn } from "@/lib/utils";

const montserratAlternates = Montserrat_Alternates({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

type SongCupBannerProps = {
  showButton?: boolean;
  buttonLabel?: string;
  className?: string;
};

export function SongCupBanner({
  showButton = true,
  buttonLabel = "GOAL",
  className,
}: SongCupBannerProps) {
  return (
    <div
      className={cn(
        montserratAlternates.className,
        "relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl bg-black py-5 lg:aspect-[1024/274] lg:py-0",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[62%] opacity-90 lg:hidden" aria-hidden>
        <Image
          src="/songchain/song-cup-banner-charts.png"
          alt=""
          fill
          className="object-cover object-left"
          sizes="50vw"
        />
      </div>

      <div
        className="pointer-events-none absolute hidden opacity-100 lg:block"
        style={{
          left: `${(-878 / 2625) * 100}%`,
          top: `${(-92 / 704) * 100}%`,
          width: `${(1669 / 2625) * 100}%`,
          height: `${(1116 / 704) * 100}%`,
        }}
        aria-hidden
      >
        <Image
          src="/songchain/song-cup-banner-charts.png"
          alt=""
          fill
          className="rounded-[5px] object-cover object-left"
          sizes="1280px"
          loading="eager"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-2 px-3 lg:h-full lg:gap-2 lg:px-4">
        <SongCupBrandLogo priority />

        <p className="max-w-full text-balance text-center text-[clamp(10px,3.2vw,32px)] font-bold uppercase leading-tight tracking-[0.02em] text-white lg:max-w-[95%] lg:leading-none lg:whitespace-nowrap">
          PREDICT YOUR WINNER. GUESS YOUR SONG
        </p>

        {showButton && (
          <SongCupGoalButton href="/songchain/song-cup" label={buttonLabel} className="animate-songcup-pulse hover:animate-none" />
        )}
      </div>
    </div>
  );
}
