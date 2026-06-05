"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Music2 } from "lucide-react";

/**
 * Home promo banner — links to the Songchain Lens hub on Creative TV.
 * Fetches runtime config so the home page can stay statically optimized.
 */
export function SongchainPromoBanner() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/songchain/status")
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const configured = enabled === true;

  return (
    <div className="w-full max-w-7xl mx-auto py-3 px-4 sm:px-6">
      <Link
        href="/songchain"
        className="group flex min-h-[72px] items-center gap-4 rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-950/80 via-fuchsia-950/60 to-indigo-950/80 px-5 py-4 shadow-sm transition hover:border-violet-400/50 hover:shadow-md"
        aria-label="Explore Songchain on Creative TV"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30">
          <Music2 className="h-6 w-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-semibold uppercase tracking-wider text-violet-300/90">
            Songchain
          </span>
          <span className="block text-base font-semibold text-white sm:text-lg">
            Onchain music feeds, exclusive drops &amp; community
          </span>
          <span className="mt-0.5 block text-sm text-violet-200/70 group-hover:text-violet-100/90">
            {enabled === null
              ? "Loading Songchain status…"
              : configured
                ? "Browse Lens posts — link Orb to like & join"
                : "Lens hub — configure feeds in env to go live"}
          </span>
        </span>
        <span className="hidden shrink-0 rounded-md bg-violet-500/90 px-3 py-1.5 text-sm font-medium text-white sm:inline-block">
          Open
        </span>
      </Link>
    </div>
  );
}
