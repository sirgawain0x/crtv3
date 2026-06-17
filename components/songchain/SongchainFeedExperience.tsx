"use client";

import { useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SongchainOrbConnect } from "@/components/songchain/SongchainOrbConnect";
import { SongchainFeedSection } from "@/components/songchain/SongchainFeedSection";
import { SongchainGroupPanel } from "@/components/songchain/SongchainGroupPanel";
import { SongchainGraphPanel } from "@/components/songchain/SongchainGraphPanel";
import { SongchainComposePost } from "@/components/songchain/SongchainComposePost";
import { SongchainBookmarksSection } from "@/components/songchain/SongchainBookmarksSection";
import { HallidayOnramp } from "@/components/songchain/HallidayOnramp";
import type { SongchainConfig } from "@/lib/songchain/config";
import type { SongchainFeedHandle } from "@/components/songchain/SongchainFeedSection";

type SongchainFeedExperienceProps = {
  config: SongchainConfig;
  id?: string;
  showWallet?: boolean;
};

export function SongchainFeedExperience({
  config,
  id = "songchain-feeds",
  showWallet = true,
}: SongchainFeedExperienceProps) {
  const publicFeedRef = useRef<SongchainFeedHandle>(null);
  const exclusiveFeedRef = useRef<SongchainFeedHandle>(null);

  return (
    <div id={id} className="scroll-mt-8 space-y-8">
      {showWallet && (
        <div className="space-y-6">
          <SongchainOrbConnect />
          <HallidayOnramp
            hallidayApiKey={config.hallidayApiKey}
            hallidayOutputAsset={config.hallidayOutputAsset}
            hallidayInputAssets={config.hallidayInputAssets}
            hallidaySandbox={config.hallidaySandbox}
          />
        </div>
      )}

      <Tabs defaultValue="feed" className="space-y-8">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="exclusive">Exclusive</TabsTrigger>
          <TabsTrigger value="group">Group</TabsTrigger>
          <TabsTrigger value="graph">Graph</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          <SongchainComposePost
            feedId={config.publicFeedId}
            onPosted={(created) => publicFeedRef.current?.registerNewPost(created)}
          />
          <SongchainFeedSection
            ref={publicFeedRef}
            title="Songchain feed"
            description="Posts from the main Songchain Lens feed (Orb)."
            feedId={config.publicFeedId}
            graphId={config.graphId}
            onPostUpdated={() => publicFeedRef.current?.reload()}
            emptyDescription="Lens custom feeds only show posts published to that feed contract. Existing Orb profile or global posts are not backfilled, so publish a new post directly to this feed if it should appear here."
          />
        </TabsContent>

        <TabsContent value="exclusive" className="space-y-6">
          <SongchainComposePost
            feedId={config.exclusiveFeedId}
            onPosted={(created) => exclusiveFeedRef.current?.registerNewPost(created)}
          />
          <SongchainFeedSection
            ref={exclusiveFeedRef}
            title="Exclusive feed"
            description="Members-only drops and announcements on Lens."
            feedId={config.exclusiveFeedId}
            graphId={config.graphId}
            onPostUpdated={() => exclusiveFeedRef.current?.reload()}
            emptyDescription="Exclusive feeds can require an Orb-linked Lens session, and posts still need to be published directly to the exclusive feed contract before they appear here."
          />
        </TabsContent>

        <TabsContent value="group">
          <SongchainGroupPanel groupId={config.groupId} />
        </TabsContent>

        <TabsContent value="graph">
          <SongchainGraphPanel graphId={config.graphId} groupId={config.groupId} />
        </TabsContent>

        <TabsContent value="bookmarks">
          <SongchainBookmarksSection graphId={config.graphId} />
        </TabsContent>
      </Tabs>

      {!config.enabled && (
        <p className="text-center text-sm text-muted-foreground">
          Configure{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_APP_ID</code> (Lens app),{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_FEED_ID</code> /{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_EXCLUSIVE_FEED_ID</code> (feed
          contracts), and{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_GROUP_ID</code>,{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_GRAPH_ID</code> with your Lens
          primitives, then redeploy if you added them after the last build. See{" "}
          <code className="text-xs">env.example</code> in the repo.
        </p>
      )}
    </div>
  );
}
