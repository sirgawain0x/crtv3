"use client";

import Link from "next/link";
import type { CreativeTVLensActivityItem } from "@/lib/creativetv/lens-activity-types";

type TVLensActivityStripProps = {
  items: CreativeTVLensActivityItem[];
};

function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncate(text: string, max = 140): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function TVLensActivityStrip({ items }: TVLensActivityStripProps) {
  if (items.length === 0) {
    return (
      <section
        aria-labelledby="tv-lens-activity-heading"
        className="mb-10 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-8"
      >
        <h2 id="tv-lens-activity-heading" className="mb-2">Community on Lens</h2>
        <p className="text-lg text-white/60">
          No posts on the Creative TV feed yet. Activity from the member graph will show here.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="tv-lens-activity-heading" className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tv-lens-activity-heading">Community on Lens</h2>
          <p className="mt-1 text-lg text-white/60">Latest from the Creative TV feed (read-only)</p>
        </div>
        <Link
          href="https://orb.club"
          target="_blank"
          rel="noopener noreferrer"
          className="tv-focusable text-base font-medium text-[#ff7800] underline-offset-4 hover:underline"
        >
          Open Orb
        </Link>
      </div>
      <div className="tv-rail pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.orbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tv-rail-item tv-card tv-focusable block min-w-[min(100%,22rem)] max-w-md shrink-0 p-5"
          >
            <div className="flex items-center justify-between gap-3 text-sm text-white/55">
              <span className="font-semibold text-white/90">{item.authorLabel}</span>
              {formatRelativeTime(item.createdAt) ? (
                <time dateTime={item.createdAt ?? undefined}>
                  {formatRelativeTime(item.createdAt)}
                </time>
              ) : null}
            </div>
            <p className="mt-3 text-lg leading-snug text-white/85">
              {item.text ? truncate(item.text) : "Shared on Lens"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
