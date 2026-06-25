"use client";

import { SongchainOrbConnect } from "@/components/songchain/SongchainOrbConnect";
import { SongCupFeedCard } from "./SongCupFeedCard";
import { SongCupGraphCard } from "./SongCupGraphCard";
import { SongCupBookmarksCard } from "./SongCupBookmarksCard";
import { SongCupSidebarCards } from "./SongCupSidebarCards";
import type { SongchainConfig } from "@/lib/songchain/config";

type SongCupBottomSectionProps = {
  config: SongchainConfig;
  feedId: string | null;
  graphId: string | null;
  groupId: string | null;
  publicFeedTitle?: string;
  publicFeedDescription?: string;
  clubGateTitle?: string;
  clubGateDescription?: string;
  orbClubUrl?: string;
  gateFeedBehindGroup?: boolean;
};

export function SongCupBottomSection({
  config,
  feedId,
  graphId,
  groupId,
  publicFeedTitle,
  publicFeedDescription,
  clubGateTitle,
  clubGateDescription,
  orbClubUrl,
  gateFeedBehindGroup = true,
}: SongCupBottomSectionProps) {
  if (!config.enabled) {
    return (
      <div id="song-cup-feed" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          Configure{" "}
          <code className="text-xs">NEXT_PUBLIC_SONG_CUP_APP_ID</code> (Lens app),{" "}
          <code className="text-xs">NEXT_PUBLIC_SONG_CUP_FEED_ID</code> /{" "}
          <code className="text-xs">NEXT_PUBLIC_SONG_CUP_GROUP_ID</code>, and{" "}
          <code className="text-xs">NEXT_PUBLIC_SONG_CUP_GRAPH_ID</code> with your Lens
          primitives. See <code className="text-xs">env.example</code>.
        </p>
      </div>
    );
  }

  return (
    <div id="song-cup-feed" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SongchainOrbConnect />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <SongCupFeedCard
            config={{ enabled: config.enabled, groupId, graphId }}
            feedId={feedId}
            publicFeedTitle={publicFeedTitle}
            publicFeedDescription={publicFeedDescription}
            clubGateTitle={clubGateTitle}
            clubGateDescription={clubGateDescription}
            orbClubUrl={orbClubUrl}
            gateFeedBehindGroup={gateFeedBehindGroup}
          />
        </div>

        <aside className="space-y-6">
          <SongCupSidebarCards />
          <SongCupGraphCard groupId={groupId} />
          <SongCupBookmarksCard graphId={graphId} />
        </aside>
      </div>
    </div>
  );
}
