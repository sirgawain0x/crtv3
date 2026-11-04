import { FairPageClient } from "@/components/chones/fair/FairPageClient";
import { loadChonesFairVideos } from "@/lib/chones/load-fair-videos";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAIR | Chones | Creative TV",
  description:
    "Chones FAIR — a curated showcase of Creative TV videos on the Chones brand channel.",
  openGraph: {
    title: "FAIR | Chones | Creative TV",
    description:
      "Chones FAIR — a curated showcase of Creative TV videos on the Chones brand channel.",
    url: "/chones/fair",
  },
};

export default async function ChonesFairPage() {
  const videos = await loadChonesFairVideos();
  return <FairPageClient videos={videos} />;
}
