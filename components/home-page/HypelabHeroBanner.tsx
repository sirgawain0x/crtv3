"use client";

import React from "react";
import { Banner } from "@hypelab/sdk-react";

const PLACEMENT_SLUG = "bea40b1af2";

/**
 * Slim HypeLab banner between hero and Trending Videos.
 * Placement slug: bea40b1af2. Property slug for SDK init: 33e2e4fa10 (in layout script).
 */
export function HypelabHeroBanner() {
  return (
    <div className="w-full max-w-7xl mx-auto py-3 px-4 sm:px-6">
      <div className="min-h-[50px] flex items-center justify-center rounded-md border border-border/50 bg-muted/30">
        <Banner placement={PLACEMENT_SLUG} />
      </div>
    </div>
  );
}
