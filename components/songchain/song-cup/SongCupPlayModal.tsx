"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SONG_CUP_PLAY_LINKS } from "@/lib/songchain/events";
import { cn } from "@/lib/utils";

type SongCupPlayModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PlayCard({
  imageSrc,
  imageAlt,
  label,
  buttonText,
  href,
}: {
  imageSrc: string;
  imageAlt: string;
  label: string;
  buttonText: string;
  href: string;
}) {
  return (
    <article className="flex flex-col items-center">
      <div className="rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 p-[2px]">
        <div className="overflow-hidden rounded-2xl bg-black">
          <div className="relative aspect-square w-full min-w-[140px] max-w-[220px] sm:max-w-[260px]">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 45vw, 260px"
            />
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-[240px] text-center text-xs font-semibold uppercase tracking-wider text-white sm:text-sm">
        {label}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-4 rounded-full bg-gradient-to-r from-[#E82594] via-fuchsia-500 to-yellow-400",
          "px-10 py-2.5 text-sm font-black uppercase tracking-widest text-black",
          "transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400",
        )}
      >
        {buttonText}
      </a>
    </article>
  );
}

export function SongCupPlayModal({ open, onOpenChange }: SongCupPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl border-0 bg-[#0a0e1a] p-6 sm:p-10",
          "bg-[radial-gradient(circle_at_30%_20%,rgba(232,37,148,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(120,40,80,0.2),transparent_45%)]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold uppercase tracking-wide text-white">
            Choose how to play
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pick predict your winner on Orb or guess your artist on Beat Me.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
          <PlayCard
            imageSrc="/songchain/song-cup-predict.png"
            imageAlt="World Cup 2026 — predict your winner"
            label="PREDICT YOUR WINNER. PLAY NOW"
            buttonText="GOAL"
            href={SONG_CUP_PLAY_LINKS.goal}
          />
          <PlayCard
            imageSrc="/songchain/song-cup-beat-me.png"
            imageAlt="Beat Me — guess your artist"
            label="GUESS YOUR ARTIST. PLAY NOW"
            buttonText="BEAT"
            href={SONG_CUP_PLAY_LINKS.beat}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
