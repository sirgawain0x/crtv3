"use client";

import Link from "next/link";
import { useState } from "react";
import type { SongchainConfig } from "@/lib/songchain/config";
import { SongCupBanner } from "@/components/songchain/SongCupBanner";
import { SongchainFeedExperience } from "@/components/songchain/SongchainFeedExperience";
import { SongCupHero } from "@/components/songchain/song-cup/SongCupHero";
import { SongCupPlayModal } from "@/components/songchain/song-cup/SongCupPlayModal";
import { SONG_CUP_CLUB_FEED_ID, SONG_CUP_CLUB_GROUP_ID, SONG_CUP_PLAY_LINKS } from "@/lib/songchain/events";

type SongCupPageClientProps = {
  config: SongchainConfig;
};

export function SongCupPageClient({ config }: SongCupPageClientProps) {
  const [playModalOpen, setPlayModalOpen] = useState(false);

  return (
    <div className="w-full">
      <nav className="mx-auto mb-0 max-w-7xl px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/songchain" className="hover:text-foreground">
          Songchain
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Song Cup Contest</span>
      </nav>

      <SongCupHero
        animationPaused={playModalOpen}
        onCtaClick={() => setPlayModalOpen(true)}
      />
      <SongCupPlayModal open={playModalOpen} onOpenChange={setPlayModalOpen} />

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        <SongCupBanner showButton={false} />
        <SongchainFeedExperience
          config={config}
          publicFeedId={SONG_CUP_CLUB_FEED_ID}
          gateGroupId={SONG_CUP_CLUB_GROUP_ID}
          hiddenTabs={["exclusive", "group"]}
          gateFeedBehindGroup
          clubGateTitle="Join the Song Cup club to unlock the feed"
          clubGateDescription="Join the Song Cup club on Lens (via Orb) to read and post on the member-only feed."
          orbClubUrl={SONG_CUP_PLAY_LINKS.goal}
          configEnvPrefix="SONG_CUP"
          publicFeedTitle="Song Cup club feed"
          publicFeedDescription="Member-only posts — available after you join the club."
        />
      </div>
    </div>
  );
}
