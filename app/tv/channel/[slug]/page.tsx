"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getBrandChannelBySlug } from "@/lib/channels/brand-channels";
import { TVVideoGrid } from "@/components/tv/TVVideoGrid";

export default function TVChannelPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const channel = getBrandChannelBySlug(slug);

  if (!channel) {
    return (
      <div className="tv-card rounded-2xl p-10 text-center">
        <h1 className="mb-4">Channel not found</h1>
        <Link href="/tv" className="tv-cast-button tv-focusable inline-flex">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link href="/tv" className="tv-focusable rounded-lg px-4 py-2 text-lg text-white/80 hover:text-white">
          ← Home
        </Link>
      </div>
      <h1 className="mb-2">{channel.name}</h1>
      <p className="mb-8 text-xl text-white/70">Featured from {channel.name}</p>
      <TVVideoGrid />
    </div>
  );
}
