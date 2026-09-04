"use client";

import Link from "next/link";
import { SongCupFeedPanel } from "@/components/songchain/song-cup/SongCupFeedPanel";
import { SpindriftXFollowStrip } from "@/components/spindrift/SpindriftXFollowStrip";
import { MixerCultureHero } from "./MixerCultureHero";
import { MixerCulturePlaylistEmbed } from "./MixerCulturePlaylistEmbed";
import { MixerCultureSubmitPanel } from "./MixerCultureSubmitPanel";
import { MixerCultureGallery } from "./MixerCultureGallery";
import type { SpindriftConfig } from "@/lib/spindrift/config";

type MixerCulturePageClientProps = {
  config: SpindriftConfig;
};

export function MixerCulturePageClient({ config }: MixerCulturePageClientProps) {
  return (
    <div className="w-full">
      <nav className="mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <div>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/spindrift" className="hover:text-foreground">
            Spindrift
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Mixer Culture</span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <MixerCultureHero className="mb-8" />
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 sm:px-6">
        <section className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-6">
          <h2 className="text-lg font-semibold text-foreground">About Mixer Culture</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Show us your Grapeade mocktail pour — a photo or short video with your recipe. Keep
            Spindrift visible in the frame. We&apos;re looking for craft, color, and pours made the
            hard way.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Grand Feature on Creative TV
            </span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Verified Badge
            </span>
          </div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Real Fruit / Zero Artificial Shortcuts
          </p>
        </section>

        <SpindriftXFollowStrip />

        <div id="mixer-culture-submit" className="scroll-mt-8">
          <MixerCultureSubmitPanel />
        </div>
        <MixerCultureGallery />
        <MixerCulturePlaylistEmbed />

        <div id="mixer-culture-feed" className="scroll-mt-8">
          {config.enabled ? (
            <SongCupFeedPanel
              feedId={config.publicFeedId}
              groupId={config.groupId}
              graphId={config.graphId}
              feedTitle="Mixer Culture feed"
              feedDescription="Community pours and recipes — join the club to read and post."
              placeholder="Share your pour…"
              orbClubUrl={
                config.groupId
                  ? `https://orb.club/c/${config.groupId}`
                  : undefined
              }
              clubLogoUrl="/spindrift/spindrift-logo.svg"
              clubLabel="Mixer Culture"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Community feed coming soon</p>
              <p className="mt-2">
                {/* TODO: wire Mixer Culture Lens feed when IDs are provisioned */}
                Set{" "}
                <code className="text-xs">NEXT_PUBLIC_MIXER_CULTURE_APP_ID</code>,{" "}
                <code className="text-xs">NEXT_PUBLIC_MIXER_CULTURE_FEED_ID</code>,{" "}
                <code className="text-xs">NEXT_PUBLIC_MIXER_CULTURE_GROUP_ID</code>, and{" "}
                <code className="text-xs">NEXT_PUBLIC_MIXER_CULTURE_GRAPH_ID</code> in your
                environment, then redeploy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
