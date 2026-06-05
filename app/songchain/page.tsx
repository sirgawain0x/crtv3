import { SongchainPageClient } from "@/components/songchain/SongchainPageClient";
import { getSongchainConfig } from "@/lib/songchain/config";
import { resolveSongchainConfig } from "@/lib/songchain/resolve-lens-app";
import type { Metadata } from "next";

/** Read Songchain env on each request (Vercel runtime vars, not build-time snapshot). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Songchain | Creative TV",
  description: "Music on Lens Chain — feeds, community group, and GHO onramp.",
};

export default async function SongchainPage() {
  const config = await resolveSongchainConfig(getSongchainConfig());
  return <SongchainPageClient config={config} />;
}
