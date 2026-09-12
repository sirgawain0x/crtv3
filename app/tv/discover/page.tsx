"use client";

import Link from "next/link";
import { TVVideoGrid } from "@/components/tv/TVVideoGrid";

export default function TVDiscoverPage() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link href="/tv" className="tv-focusable rounded-lg px-4 py-2 text-lg text-white/80 hover:text-white">
          ← Home
        </Link>
      </div>
      <h1 className="mb-8">Discover</h1>
      <TVVideoGrid />
    </div>
  );
}
