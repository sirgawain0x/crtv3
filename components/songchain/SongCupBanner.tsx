"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SongCupBannerProps = {
  showButton?: boolean;
  buttonLabel?: string;
  className?: string;
};

export function SongCupBanner({
  showButton = true,
  buttonLabel = "Compete",
  className,
}: SongCupBannerProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl",
        className,
      )}
    >
      <Image
        src="/songchain/song-cup-banner.png"
        alt="Song Cup — Predict your winner. Guess your song."
        width={1400}
        height={400}
        className="h-auto w-full object-cover"
        priority
      />
      {showButton && (
        <div className="absolute inset-x-0 bottom-[8%] flex justify-center sm:bottom-[10%]">
          <Link
            href="/songchain/song-cup"
            className="rounded-full bg-gradient-to-r from-[#E82594] to-[#FF66CC] px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF66CC] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-10 sm:py-3 sm:text-base"
          >
            {buttonLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
