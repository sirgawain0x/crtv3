import { SongCupPageClient } from "@/components/songchain/song-cup/SongCupPageClient";
import { getSongCupConfig } from "@/lib/songchain/config";
import { resolveSongchainConfig } from "@/lib/songchain/resolve-lens-app";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song Cup Contest | Songchain | Creative TV",
  description:
    "Predict your winner. Guess your song. Song Cup Contest on Songchain — music on Lens Chain.",
};

export default async function SongCupPage() {
  const config = await resolveSongchainConfig(getSongCupConfig());
  return <SongCupPageClient config={config} />;
}
