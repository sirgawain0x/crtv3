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
};

export function SpindriftXFollowStrip({ className }: SpindriftXFollowStripProps) {
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
        className="rounded-md px-2 py-1 text-emerald-600 transition hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-300"
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
        className="rounded-md px-2 py-1 text-emerald-600 transition hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-300"
      >
        @{CREATIVE_TV_X_HANDLE}
      </a>
    </div>
  );
}
