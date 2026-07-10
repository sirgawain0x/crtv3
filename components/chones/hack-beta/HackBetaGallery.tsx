"use client";

import Link from "next/link";
import { Film, Loader2, Star } from "lucide-react";
import { HackBetaShareToXButton } from "@/components/chones/hack-beta/HackBetaShareToXButton";
import { useHackBetaApprovedSubmissions } from "@/lib/hooks/hack-beta/useHackBetaApprovedSubmissions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type HackBetaGalleryProps = {
  className?: string;
};

export function HackBetaGallery({ className }: HackBetaGalleryProps) {
  const { submissions, isLoading, error } = useHackBetaApprovedSubmissions();

  return (
    <section className={cn("space-y-4", className)} aria-labelledby="hack-beta-gallery-heading">
      <div>
        <h2 id="hack-beta-gallery-heading" className="text-xl font-bold text-foreground">
          Demo gallery
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved HACKATHON BETA submissions. Favorites appear first.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading gallery…
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isLoading && !error && submissions.length === 0 && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          <Film className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No approved demos yet. Submit yours above.
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {submissions.map((s) => (
          <li
            key={s.id}
            className="overflow-hidden rounded-xl border border-border/60 bg-card/40"
          >
            <Link href={`/discover/${s.video_asset_id}`} className="block">
              {s.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.thumbnail_url}
                  alt={s.title || "Demo"}
                  className="aspect-video w-full bg-black object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted/40">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </Link>
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-semibold">
                  {s.title || "Untitled demo"}
                </h3>
                {s.is_favorite && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    Favorite
                  </Badge>
                )}
              </div>
              {s.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              )}
              <HackBetaShareToXButton title={s.title} size="sm" variant="ghost" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
