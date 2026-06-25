import { SongCupPageClient } from "@/components/songchain/song-cup/SongCupPageClient";
import { getSongCupConfig } from "@/lib/songchain/config";
import { resolveSongchainConfig } from "@/lib/songchain/resolve-lens-app";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SONG_CUP_OG_IMAGE = {
  url: "/songchain/song-cup-banner.png",
  width: 1024,
  height: 274,
  alt: "Song Cup — Predict your winner. Guess your song.",
  type: "image/png",
} as const;

export const metadata: Metadata = {
  title: "Song Cup | Songchain | Creative TV",
  description:
    "Predict your winner. Guess your song. Song Cup on Songchain — music on Orb.",
  openGraph: {
    title: "Song Cup | Songchain | Creative TV",
    description:
      "Predict your winner. Guess your song. Song Cup on Songchain — music on Orb.",
    type: "website",
    url: "/songchain/song-cup",
    images: [SONG_CUP_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Song Cup | Songchain | Creative TV",
    description:
      "Predict your winner. Guess your song. Song Cup on Songchain — music on Orb.",
    images: [SONG_CUP_OG_IMAGE.url],
  },
};

export default async function SongCupPage() {
  const config = await resolveSongchainConfig(getSongCupConfig());
  return <SongCupPageClient config={config} />;
}
