"use client";

import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

type MixerCultureGalleryProps = {
  className?: string;
};

export function MixerCultureGallery({ className }: MixerCultureGalleryProps) {
  return (
    <section className={cn("space-y-4", className)} aria-labelledby="mixer-culture-gallery-heading">
      <div>
        <h2 id="mixer-culture-gallery-heading" className="text-xl font-bold text-foreground">
          Pour gallery
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved Grapeade mocktail pours from the community. Favorites appear first.
        </p>
      </div>

      {/* TODO: wire mixer-culture approved submissions gallery when backend is live */}
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        <Film className="mx-auto mb-2 h-8 w-8 opacity-50" />
        No approved pours yet. Be the first to submit yours above.
      </div>
    </section>
  );
}
