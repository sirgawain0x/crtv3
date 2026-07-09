"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import { cn } from "@/lib/utils";

type HackBetaBannerProps = {
  className?: string;
};

export function HackBetaBanner({ className }: HackBetaBannerProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl min-h-[220px]",
        "lg:aspect-[1024/274]",
        className,
      )}
    >
      <Image
        src="/chones/hack-beta/hackathon-beta-tv-combined-outlined.svg"
        alt="Chones HACKATHON BETA"
        fill
        className="object-cover object-center"
        priority
        unoptimized
        sizes="(max-width: 1280px) 100vw, 1280px"
      />
      <div className="absolute inset-0 flex items-end justify-center pb-4 sm:pb-5">
        <SongCupGoalButton
          href="/chones/hack-beta"
          label="Proceed"
          className="animate-songcup-pulse hover:animate-none"
        />
      </div>
    </div>
  );
}
