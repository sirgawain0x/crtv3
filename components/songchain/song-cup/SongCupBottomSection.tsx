"use client";

import { useState } from "react";
import { SongchainGatedFeedTab } from "@/components/songchain/SongchainGatedFeedTab";
import { SongCupPreviewPanel } from "./SongCupPreviewPanel";
import { SongCupSidebarIcons } from "./SongCupSidebarIcons";
import { SONG_CUP_BUTTON_ICONS, type SongCupPanel } from "./song-cup-icons";
import type { SongchainConfig } from "@/lib/songchain/config";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils/utils";

type SongCupBottomSectionProps = {
  config: SongchainConfig;
  feedId: string | null;
  groupId: string | null;
  graphId: string | null;
  publicFeedTitle?: string;
  publicFeedDescription?: string;
  clubGateTitle?: string;
  clubGateDescription?: string;
  orbClubUrl?: string;
};

export type { SongCupPanel };

function getPreviewCopy(panel: SongCupPanel) {
  switch (panel) {
    case "songcup":
      return {
        title: "Song Cup",
        description:
          "Official Song Cup preview window. Add rules, prizes, timeline, and a featured video.",
      };
    case "pixels":
      return {
        title: "Create with Pixels",
        description: "Pixel-art creator tools and galleries for the Song Cup community.",
      };
    case "submit":
      return {
        title: "Submit",
        description: "Upload your track, artwork, or entry for the current round.",
      };
    case "vote":
      return { title: "Vote", description: "Cast your votes for this round’s entries." };
    case "predict":
      return { title: "Predict", description: "Predict outcomes and compete on the leaderboard." };
    case "leaderboard":
      return { title: "Leaderboard", description: "Top contributors, voters, and creators this season." };
    default:
      return { title: panel, description: `Preview content for ${panel}.` };
  }
}

function FeedPanel(props: SongCupBottomSectionProps) {
  return (
    <SongchainGatedFeedTab
      gateGroupId={props.groupId}
      feedId={props.feedId}
      graphId={props.graphId}
      feedTitle={props.publicFeedTitle ?? "Song Cup club feed"}
      feedDescription={
        props.publicFeedDescription ??
        "Read the member feed. Join the club on Lens to post and react."
      }
      clubGateTitle={props.clubGateTitle}
      clubGateDescription={props.clubGateDescription}
      orbClubUrl={props.orbClubUrl}
      allowReadBeforeJoin
      animated
    />
  );
}

function PreviewPanel({ panel }: { panel: SongCupPanel }) {
  const copy = getPreviewCopy(panel);
  return <SongCupPreviewPanel title={copy.title} description={copy.description} showVideo />;
}

function ActivePanel({
  panel,
  props,
}: {
  panel: SongCupPanel;
  props: SongCupBottomSectionProps;
}) {
  if (panel === "feed") return <FeedPanel {...props} />;
  return <PreviewPanel panel={panel} />;
}

function MobileDivider() {
  return <hr className="w-full border-0 border-t border-fuchsia-500/40" aria-hidden />;
}

export function SongCupBottomSection(props: SongCupBottomSectionProps) {
  const { config } = props;
  const [activePanel, setActivePanel] = useState<SongCupPanel>("feed");
  const isDesktopQuery = useMediaQuery("(min-width: 1024px)");
  const isDesktop = isDesktopQuery ?? true;

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

  if (isDesktop) {
    return (
      <div id="song-cup-feed" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <main className="order-2 min-h-[480px] rounded-2xl border border-fuchsia-500/20 p-4 sm:p-6 lg:order-1">
            <ActivePanel panel={activePanel} props={props} />
          </main>
          <aside className="order-1 space-y-6 lg:order-2">
            <SongCupSidebarIcons
              active={activePanel}
              onSelect={setActivePanel}
              className="flex flex-col items-center gap-2"
            />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div id="song-cup-feed" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4">
        {SONG_CUP_BUTTON_ICONS.map(({ id, src, alt, externalHref, dividerAfter }) => {
          const isActive = activePanel === id;
          const isPanel = id !== "beatme" && id !== "worldcup";
          return (
            <div key={id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                {externalHref ? (
                  <a
                    href={externalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-fuchsia-500/10"
                  >
                    <img src={src} alt={alt} className="h-24 w-24 object-contain" />
                    <span className="font-medium">{alt}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isPanel) {
                        setActivePanel(id as SongCupPanel);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-2 transition-all w-full text-left",
                      isActive ? "bg-fuchsia-500/15 ring-1 ring-fuchsia-500" : "hover:bg-fuchsia-500/10",
                    )}
                    aria-pressed={isPanel ? isActive : undefined}
                  >
                    <img src={src} alt={alt} className="h-24 w-24 object-contain" />
                    <span className="font-medium">{alt}</span>
                  </button>
                )}
              </div>
              {isActive && isPanel && (
                <div className="min-h-[320px] rounded-2xl border border-fuchsia-500/20 bg-black/40 p-4 sm:p-5">
                  <ActivePanel panel={id as SongCupPanel} props={props} />
                </div>
              )}
              {dividerAfter && <MobileDivider />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
