"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SongchainOrbConnect } from "@/components/songchain/SongchainOrbConnect";
import { SongchainFeedSection } from "@/components/songchain/SongchainFeedSection";
import { SongchainGroupPanel } from "@/components/songchain/SongchainGroupPanel";
import { SongchainGraphPanel } from "@/components/songchain/SongchainGraphPanel";
import { SongchainComposePost } from "@/components/songchain/SongchainComposePost";
import { SongchainBookmarksSection } from "@/components/songchain/SongchainBookmarksSection";
import { SongchainLensAdvancedPanel } from "@/components/songchain/SongchainLensAdvancedPanel";
import { HallidayOnramp } from "@/components/songchain/HallidayOnramp";
import type { SongchainConfig } from "@/lib/songchain/config";
import { Music2 } from "lucide-react";
import { useRef } from "react";
import type { SongchainFeedHandle } from "@/components/songchain/SongchainFeedSection";

type SongchainPageClientProps = {
  config: SongchainConfig;
};

export function SongchainPageClient({ config }: SongchainPageClientProps) {
  const publicFeedRef = useRef<SongchainFeedHandle>(null);
  const exclusiveFeedRef = useRef<SongchainFeedHandle>(null);

  return (
    <div className="mx-auto w-full max-w-7xl py-10 px-4 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Songchain</span>
      </nav>

      <header className="relative mb-10 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/90 via-fuchsia-950/70 to-slate-950 p-8 sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-300">
            <Music2 className="h-4 w-4" aria-hidden />
            Lens · Orb
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Songchain
          </h1>
          <p className="mt-3 text-violet-100/80">
            Music on Lens Chain — public and exclusive feeds, community group, and
            onramp via Halliday. Interactions require a linked Orb account.
          </p>
        </div>
      </header>

      <div className="mb-8 space-y-6">
        <SongchainOrbConnect />
        <HallidayOnramp
          hallidayApiKey={config.hallidayApiKey}
          hallidayOutputAsset={config.hallidayOutputAsset}
          hallidayInputAssets={config.hallidayInputAssets}
          hallidaySandbox={config.hallidaySandbox}
        />
      </div>

      <Tabs defaultValue="feed" className="space-y-8">
        <TabsList className="flex flex-wrap h-auto gap-1">
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

      <SongchainLensAdvancedPanel className="mt-10" />

      {!config.enabled && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
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
