"use client";

import { useEffect } from "react";
import Image from "next/image";
import { TVHomeRails } from "@/components/tv/TVHomeRails";
import { TVLiveRail } from "@/components/tv/TVLiveRail";
import { TVVideoGrid } from "@/components/tv/TVVideoGrid";
import { startTVSessionTracker } from "@/lib/analytics/tv-events";

export default function TVHomePage() {
  useEffect(() => {
    const stop = startTVSessionTracker("tv-home");
    return stop;
  }, []);

  return (
    <div>
      <header className="mb-10 flex items-center gap-6">
        <Image
          src="/images/Creative_TV_Logo.png"
          alt="Creative TV"
          width={72}
          height={72}
          className="rounded-xl"
          priority
        />
        <div>
          <h1>Creative TV</h1>
          <p className="mt-2 text-xl text-white/70">The Way Content Should Be.</p>
        </div>
      </header>

      <TVLiveRail />
      <TVHomeRails />
      <TVVideoGrid />
    </div>
  );
}
