"use client";

import Image from "next/image";
import { channelBannerShell } from "@/lib/banners/channel-banner-shell";
import { cn } from "@/lib/utils";

type SpindriftHubHeroProps = {
  className?: string;
};

export function SpindriftHubHero({ className }: SpindriftHubHeroProps) {
  return (
    <section
      className={cn(
        channelBannerShell("relative overflow-hidden bg-[#1a0a2e]"),
        "aspect-[16/9] sm:aspect-[1024/274]",
        className,
      )}
    >
      <Image
        src="/spindrift/hero-pour.png"
        alt="Grapeade pour — Mixer Culture on Creative TV"
        fill
        className="object-cover object-center"
        priority
        sizes="(max-width: 1280px) 100vw, 1280px"
      />
    </section>
  );
}
