"use client";

import Image from "next/image";
import { SongCupGoalButton } from "@/components/songchain/song-cup/SongCupGoalButton";
import { cn } from "@/lib/utils";

type MixerCultureHeroProps = {
  className?: string;
};

export function MixerCultureHero({ className }: MixerCultureHeroProps) {
  const scrollToSubmit = () => {
    const element = document.getElementById("mixer-culture-submit");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      return;
    }
    document.getElementById("mixer-culture-feed")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className={cn(
        "relative mx-auto min-h-[220px] w-full max-w-7xl overflow-hidden rounded-xl bg-[#f5f9f6]",
        "lg:aspect-[1024/274]",
        className,
      )}
    >
      <Image
        src="/spindrift/mixer-culture/mixer-culture-hero.svg"
        alt="Spindrift Mixer Culture — Grapeade mocktail pours"
        fill
        className="object-cover object-center"
        priority
        unoptimized
        sizes="(max-width: 1280px) 100vw, 1280px"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/50 via-transparent to-transparent px-4 pb-6 sm:pb-8">
        <p className="text-center text-sm font-medium text-white/90 sm:text-base">
          Grapeade mocktail pours · Real fruit, made the hard way
        </p>
        <SongCupGoalButton
          label="Submit"
          onClick={scrollToSubmit}
          className="animate-songcup-pulse hover:animate-none"
        />
      </div>
    </section>
  );
}
