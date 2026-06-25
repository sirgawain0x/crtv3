"use client";

import React, { useRef, type ReactNode, Children } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/utils";

type SongchainPostTimelineProps = {
  children: ReactNode;
  className?: string;
  /** Enables a contained, scroll-driven animation where posts scale/opacity change near the center. */
  animated?: boolean;
};

function AnimatedItem({
  children,
  scrollY,
  containerRef,
}: {
  children: ReactNode;
  scrollY: ReturnType<typeof useScroll>["scrollY"];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const getCloseness = () => {
    const container = containerRef.current;
    const item = ref.current;
    if (!container || !item) return 0;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    const itemCenter = itemRect.top + itemRect.height / 2;
    const distance = Math.abs(containerCenter - itemCenter);
    const maxDistance = Math.max(1, containerRect.height / 2);
    return Math.max(0, 1 - distance / maxDistance);
  };

  const scale = useTransform(scrollY, () => 0.94 + getCloseness() * 0.1);
  const opacity = useTransform(scrollY, () => 0.65 + getCloseness() * 0.35);

  return (
    <motion.div ref={ref} style={{ scale, opacity }} className="origin-center will-change-transform">
      {children}
    </motion.div>
  );
}

/** Single-column chronological feed with a vertical story line. */
export function SongchainPostTimeline({
  children,
  className,
  animated = false,
}: SongchainPostTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });

  const timelineChildren = animated
    ? Children.toArray(children).map((child, i) => (
        <AnimatedItem key={i} scrollY={scrollY} containerRef={containerRef}>
          {child}
        </AnimatedItem>
      ))
    : children;

  const inner = (
    <>
      <div
        className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-violet-500/40 via-border/60 to-transparent sm:left-6"
        aria-hidden
      />
      <div className="relative space-y-8 pl-10 sm:pl-14">{timelineChildren}</div>
    </>
  );

  if (!animated) {
    return (
      <div className={cn("relative mx-auto w-full max-w-2xl", className)}>
        {inner}
      </div>
    );
  }

  return (
    <div className={cn("relative mx-auto w-full max-w-2xl", className)}>
      <div
        ref={containerRef}
        className="h-[600px] overflow-y-auto overflow-x-hidden rounded-xl border border-border/40 bg-card/20 px-2 py-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {inner}
      </div>
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
