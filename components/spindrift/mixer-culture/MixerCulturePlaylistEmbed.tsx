"use client";

import { cn } from "@/lib/utils";

// TODO: replace with live Spindrift playlist URL when provisioned
const SPINDRIFT_PLAYLIST_URL =
  process.env.NEXT_PUBLIC_SPINDRIFT_PLAYLIST_URL?.trim() || "";

type MixerCulturePlaylistEmbedProps = {
  className?: string;
};

export function MixerCulturePlaylistEmbed({ className }: MixerCulturePlaylistEmbedProps) {
  const hasPlaylist = Boolean(SPINDRIFT_PLAYLIST_URL);

  return (
    <section
      aria-labelledby="mixer-culture-playlist-heading"
      className={cn("space-y-3", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="mixer-culture-playlist-heading"
          className="text-lg font-semibold text-foreground"
        >
          Mixer Culture Playlist
        </h2>
        {hasPlaylist && (
          <a
            href={SPINDRIFT_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Open playlist
          </a>
        )}
      </div>

      {hasPlaylist ? (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <iframe
            title="Spindrift Mixer Culture Playlist"
            src={SPINDRIFT_PLAYLIST_URL}
            className="min-h-[480px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {/* TODO: set NEXT_PUBLIC_SPINDRIFT_PLAYLIST_URL when Air playlist is created */}
          Playlist coming soon — curated pours and mocktail inspiration.
        </div>
      )}
    </section>
  );
}
