"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SongchainOrbConnect } from "@/components/songchain/SongchainOrbConnect";
import { SongchainFeedSection } from "@/components/songchain/SongchainFeedSection";
import { SongchainGroupPanel } from "@/components/songchain/SongchainGroupPanel";
import { HallidayOnramp } from "@/components/songchain/HallidayOnramp";
import type { SongchainConfig } from "@/lib/songchain/config";
import { Music2 } from "lucide-react";

type SongchainPageClientProps = {
  config: SongchainConfig;
};

export function SongchainPageClient({ config }: SongchainPageClientProps) {
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
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="exclusive">Exclusive</TabsTrigger>
          <TabsTrigger value="group">Group</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <SongchainFeedSection
            title="Songchain feed"
            description="Posts from the main Songchain Lens feed (Orb)."
            feedId={config.publicFeedId}
          />
        </TabsContent>

        <TabsContent value="exclusive">
          <SongchainFeedSection
            title="Exclusive feed"
            description="Members-only drops and announcements on Lens."
            feedId={config.exclusiveFeedId}
          />
        </TabsContent>

        <TabsContent value="group">
          <SongchainGroupPanel groupId={config.groupId} />
        </TabsContent>
      </Tabs>

      {!config.enabled && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Configure{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_FEED_ID</code>,{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_EXCLUSIVE_FEED_ID</code>, and{" "}
          <code className="text-xs">NEXT_PUBLIC_SONGCHAIN_GROUP_ID</code> with your Lens
          primitives, then redeploy if you added them after the last build.
        </p>
      )}
    </div>
  );
}
