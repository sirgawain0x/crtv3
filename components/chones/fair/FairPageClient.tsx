"use client";

import Link from "next/link";
import { ChonesXFollowStrip } from "@/components/chones/ChonesXFollowStrip";
import { FairVideoGrid } from "@/components/chones/fair/FairVideoGrid";
import type { VideoAsset } from "@/lib/types/video-asset";

type FairPageClientProps = {
  videos: VideoAsset[];
};

export function FairPageClient({ videos }: FairPageClientProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/chones" className="hover:text-foreground">
          Chones
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">FAIR</span>
      </nav>

      <header className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Chones event
        </p>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">FAIR</h1>
        <p className="max-w-2xl text-muted-foreground">
          A fixed showcase of Creative TV videos curated for the Chones FAIR event.
        </p>
      </header>

      <ChonesXFollowStrip className="mb-10" />

      <section aria-labelledby="fair-videos-heading" className="space-y-4">
        <div>
          <h2 id="fair-videos-heading" className="text-xl font-bold text-foreground">
            Featured videos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hand-picked uploads from the Creative TV catalog.
          </p>
        </div>
        <FairVideoGrid videos={videos} />
      </section>
    </div>
  );
}
