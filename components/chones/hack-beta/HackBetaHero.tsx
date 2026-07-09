"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import { cn } from "@/lib/utils";

type HackBetaHeroProps = {
  className?: string;
};

export function HackBetaHero({ className }: HackBetaHeroProps) {
  const scrollToFeed = () => {
    const element = document.getElementById("hack-beta-feed");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      className={cn(
        "relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl min-h-[220px]",
        "lg:aspect-[1016/572]",
        className,
      )}
    >
      <Image
        src="/chones/hack-beta/hackathon-beta-tv-combined-outlined.svg"
        alt="Chones HACKATHON BETA — July 20–24, 2026 Virtual"
        fill
        className="object-cover object-center"
        priority
        unoptimized
        sizes="(max-width: 1280px) 100vw, 1280px"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/50 via-transparent to-transparent px-4 pb-6 sm:pb-8">
        <p className="text-center text-sm font-medium text-white/90 sm:text-base">
          July 20–24, 2026 · Virtual
        </p>
        <SongCupGoalButton
          label="Proceed"
          onClick={scrollToFeed}
          className="animate-songcup-pulse hover:animate-none"
        />
      </div>
    </section>
  );
}
