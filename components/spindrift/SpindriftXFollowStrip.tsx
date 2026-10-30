"use client";

import { Twitter } from "lucide-react";
import {
  CREATIVE_TV_X_HANDLE,
  CREATIVE_TV_X_URL,
  SPINDRIFT_X_HANDLE,
  SPINDRIFT_X_URL,
} from "@/lib/spindrift/social";
import { cn } from "@/lib/utils";

type SpindriftXFollowStripProps = {
  className?: string;
  accent?: "channel" | "grapeade";
};

const linkAccentClass = {
  channel:
    "text-emerald-600 transition hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-300",
  grapeade:
    "text-violet-600 transition hover:bg-violet-500/10 hover:text-violet-500 dark:text-violet-300",
} as const;

export function SpindriftXFollowStrip({
  className,
  accent = "channel",
}: SpindriftXFollowStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <Twitter className="h-4 w-4" aria-hidden />
        Follow
      </span>
      <a
        href={SPINDRIFT_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("rounded-md px-2 py-1", linkAccentClass[accent])}
      >
        @{SPINDRIFT_X_HANDLE}
      </a>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <a
        href={CREATIVE_TV_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("rounded-md px-2 py-1", linkAccentClass[accent])}
      >
        @{CREATIVE_TV_X_HANDLE}
      </a>
    </div>
  );
}
