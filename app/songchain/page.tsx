import { SongchainPageClient } from "@/components/songchain/SongchainPageClient";
import { getSongchainConfig } from "@/lib/songchain/config";
import type { Metadata } from "next";

/** Read Songchain env on each request (Vercel runtime vars, not build-time snapshot). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Songchain | Creative TV",
  description: "Music on Lens Chain — feeds, community group, and GHO onramp.",
};

export default function SongchainPage() {
  const config = getSongchainConfig();
  return <SongchainPageClient config={config} />;
}
