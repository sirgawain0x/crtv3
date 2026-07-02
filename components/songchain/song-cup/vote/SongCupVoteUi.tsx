"use client";

import type { ReactNode } from "react";
import { Big_Shoulders } from "next/font/google";
import { cn } from "@/lib/utils/utils";
import {
  SONG_CUP_VOTE_ASSETS,
  SONG_CUP_VOTE_COLORS,
  SONG_CUP_VOTE_GRADIENT,
  SONG_CUP_VOTE_GRADIENT_CTA,
  SONG_CUP_VOTE_MATCHUP_GRADIENT,
} from "@/lib/songchain/song-cup/vote-design";
import { songCupPanel, songCupMuted } from "@/lib/songchain/song-cup/panel-styles";

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

/** 161:781 — blurred gradient glow */
export function SongCupVoteGradientGlow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute blur-[75px]",
        className,
      )}
      style={{ backgroundImage: SONG_CUP_VOTE_GRADIENT }}
      aria-hidden
    />
  );
}

/** 163:962 — VOTE NOW title */
export function SongCupVoteTitle({ className }: { className?: string }) {
  return (
    <h2
      className={cn(
        "text-[40px] font-bold leading-[20px] tracking-[-0.2px] text-foreground dark:text-white sm:text-[50px] sm:leading-none",
        className,
      )}
    >
      VOTE NOW
    </h2>
  );
}

/** 161:803 / 161:809 / 161:810 — filter pills */
export function SongCupVoteFilterPill({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[47px] items-center justify-center rounded-[46px] px-[10px] py-[2px] text-[17px] font-medium leading-[22px] tracking-[0.2px] transition",
        active
          ? "text-black"
          : "bg-muted/60 text-foreground hover:bg-muted dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/15",
        className,
      )}
      style={active ? { backgroundImage: SONG_CUP_VOTE_GRADIENT_CTA } : undefined}
    >
      {label}
    </button>
  );
}

/** 163:964 — date line */
export function SongCupVoteRoundDate({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-center text-[15px] font-bold leading-normal tracking-[-0.1px] text-foreground dark:text-white",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** 163:966 — round title */
export function SongCupVoteRoundTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-center text-[25px] font-bold leading-normal tracking-[-0.1px] text-foreground dark:text-white",
        className,
      )}
    >
      {children}
    </h3>
  );
}

/** 163:974 / 164:1000 — entry name (SILVER RAIDS) */
export function SongCupVoteEntryName({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        bigShoulders.className,
        "text-right text-[18px] font-bold uppercase leading-normal tracking-[-0.3px] sm:text-[25px]",
        className,
      )}
      style={{ color: SONG_CUP_VOTE_COLORS.yellow }}
    >
      {children}
    </p>
  );
}

/** 163:996 / 164:1001 — entry sublabel (RIA) */
export function SongCupVoteEntryTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-right text-xs font-bold uppercase leading-normal tracking-[-0.3px] sm:text-base",
        className,
      )}
      style={{ color: SONG_CUP_VOTE_COLORS.magenta }}
    >
      {children}
    </p>
  );
}

/** 164:1004 / 164:1019 — VS */
export function SongCupVoteVs({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        bigShoulders.className,
        "text-[30px] font-bold uppercase leading-normal tracking-[-0.3px] text-foreground dark:text-white",
        className,
      )}
    >
      VS
    </span>
  );
}

/** 163:981 / 164:1009 — gradient progress line */
export function SongCupVoteProgressLine({
  pct,
  className,
}: {
  pct: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("relative h-[3px] w-[104px] max-w-full", className)}>
      <img
        src={SONG_CUP_VOTE_ASSETS.progressLine}
        alt=""
        aria-hidden
        className="h-full w-full rotate-180 object-cover opacity-40"
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${clamped}%` }}
      >
        <img
          src={SONG_CUP_VOTE_ASSETS.progressLine}
          alt=""
          aria-hidden
          className="h-full w-[104px] rotate-180 object-cover"
        />
      </div>
    </div>
  );
}

/** 164:1006 / 164:1013 — vote percentage */
export function SongCupVotePercent({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-right text-xs font-bold leading-normal tracking-[0.2px] text-foreground dark:text-white",
        className,
      )}
    >
      {value}%
    </p>
  );
}

/** 164:1088 — VOTE NOW CTA pill */
export function SongCupVoteCtaButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-[47px] min-w-[132px] items-center justify-center rounded-[46px] px-[10px] py-[2px] text-[17px] font-medium leading-[22px] tracking-[0.2px] text-black transition disabled:opacity-70",
        className,
      )}
      style={{ backgroundImage: SONG_CUP_VOTE_GRADIENT_CTA }}
    >
      {children}
    </button>
  );
}

/** 163:969 — matchup inner panel */
export function SongCupVoteMatchupSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-white/[0.12] px-4 py-6 sm:px-8 sm:py-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: SONG_CUP_VOTE_MATCHUP_GRADIENT }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** 163:959 — Song Cup logo strip above matchups */
export function SongCupVoteLogoBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto h-[49px] w-[153px] overflow-hidden rounded-[20px] border border-[#dc2bb3] bg-black",
        className,
      )}
    >
      <img
        src={SONG_CUP_VOTE_ASSETS.songCupLogoStrip}
        alt="Song Cup"
        className="absolute left-[-8.8%] top-[-1%] h-[206%] w-[128%] max-w-none object-cover"
      />
    </div>
  );
}

/** 163:957 — corner vote ornament */
export function SongCupVoteCornerOrnament({
  className,
  position = "top-left",
}: {
  className?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const positionClass =
    position === "top-left"
      ? "-left-2 -top-2"
      : position === "top-right"
        ? "-right-2 -top-2 rotate-90"
        : position === "bottom-left"
          ? "-bottom-2 -left-2 -rotate-90"
          : "-bottom-2 -right-2 rotate-180";

  return (
    <img
      src={SONG_CUP_VOTE_ASSETS.cornerOrnament}
      alt=""
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-[60px] w-[60px] object-contain sm:h-[108px] sm:w-[108px]",
        positionClass,
        className,
      )}
    />
  );
}

/** 158:39 — post thumbnail frame */
export function SongCupVotePostFrame({
  src,
  alt = "",
  className,
  children,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative size-[107px] shrink-0 overflow-hidden rounded-[15px] border border-[#dc2bb3] bg-black",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : !children ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SONG_CUP_VOTE_ASSETS.postPlaceholder}
          alt=""
          className="size-full object-cover"
        />
      ) : null}
      {children}
    </div>
  );
}

/** 163:958 — black content well */
export function SongCupVoteContentWell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-[480px] overflow-hidden p-4 sm:p-6",
        songCupPanel,
        className,
      )}
    >
      {children}
    </div>
  );
}
