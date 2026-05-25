"use client";

import React from "react";
import { Banner } from "@hypelab/sdk-react";
import { getHypelabConfig } from "@/lib/ads/hypelab";

/**
 * Slim HypeLab banner between hero and Trending Videos.
 * Requires NEXT_PUBLIC_HYPELAB_ENABLED=true and allowlisted domain in HypeLab dashboard.
 */
export function HypelabHeroBanner() {
  const hypelab = getHypelabConfig();
  if (!hypelab.enabled) return null;

  return (
    <div className="w-full max-w-7xl mx-auto py-3 px-4 sm:px-6">
      <div className="min-h-[50px] flex items-center justify-center rounded-md border border-border/50 bg-muted/30">
        <Banner placement={hypelab.placementSlug} />
      </div>
    </div>
  );
}
