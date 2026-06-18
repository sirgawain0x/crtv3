"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";

type SongchainPostTimelineProps = {
  children: ReactNode;
  className?: string;
};

/** Single-column chronological feed with a vertical story line. */
export function SongchainPostTimeline({
  children,
  className,
}: SongchainPostTimelineProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-2xl", className)}>
      <div
        className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-violet-500/40 via-border/60 to-transparent sm:left-6"
        aria-hidden
      />
      <div className="relative space-y-8 pl-10 sm:pl-14">{children}</div>
    </div>
  );
}

type SongchainPostTimelineItemProps = {
  children: ReactNode;
  className?: string;
  isQuote?: boolean;
};

export function SongchainPostTimelineItem({
  children,
  className,
  isQuote = false,
}: SongchainPostTimelineItemProps) {
  return (
    <div
      className={cn(
        "relative",
        isQuote && "rounded-xl ring-1 ring-violet-500/30 ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -left-10 top-7 h-3 w-3 rounded-full border-2 bg-background sm:-left-14",
          isQuote ? "border-violet-400 bg-violet-500/20" : "border-violet-500",
        )}
        aria-hidden
      />
      {children}
    </div>
  );
}
