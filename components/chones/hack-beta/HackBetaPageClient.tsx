"use client";

import Link from "next/link";
import { SongchainOrbConnect } from "@/components/songchain/SongchainOrbConnect";
import { SongCupFeedPanel } from "@/components/songchain/song-cup/SongCupFeedPanel";
import type { ChonesConfig } from "@/lib/chones/config";
import { HackBetaHero } from "./HackBetaHero";

type HackBetaPageClientProps = {
  config: ChonesConfig;
};

export function HackBetaPageClient({ config }: HackBetaPageClientProps) {
  return (
    <div className="w-full">
      <nav className="mx-auto mb-4 max-w-7xl px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/chones" className="hover:text-foreground">
          Chones
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">HACKATHON BETA</span>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <HackBetaHero className="mb-8" />
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 sm:px-6">
        <SongchainOrbConnect />

        <div id="hack-beta-feed" className="scroll-mt-8">
          {config.enabled ? (
            <SongCupFeedPanel
              feedId={config.publicFeedId}
              groupId={config.groupId}
              graphId={config.graphId}
              feedTitle="HACKATHON BETA feed"
              feedDescription="Member-only posts — join the club on Orb to read and post on the hackathon feed."
            />
          ) : (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Lens feed not configured yet</p>
              <p className="mt-2">
                Set{" "}
                <code className="text-xs">NEXT_PUBLIC_HACK_BETA_APP_ID</code>,{" "}
                <code className="text-xs">NEXT_PUBLIC_HACK_BETA_FEED_ID</code>,{" "}
                <code className="text-xs">NEXT_PUBLIC_HACK_BETA_GROUP_ID</code>, and{" "}
                <code className="text-xs">NEXT_PUBLIC_HACK_BETA_GRAPH_ID</code> in your
                environment, then redeploy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
