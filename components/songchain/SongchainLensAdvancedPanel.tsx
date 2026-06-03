"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

type SongchainLensAdvancedPanelProps = {
  className?: string;
};

/**
 * Documents Lens primitives not yet exposed in-app (boost, custom feed rules, post rules).
 * Manage feeds and rules in the Lens / Orb dashboard until admin UI is built.
 */
export function SongchainLensAdvancedPanel({ className }: SongchainLensAdvancedPanelProps) {
  return (
    <section
      className={`rounded-lg border border-border/40 bg-muted/20 p-6 text-sm text-muted-foreground ${className ?? ""}`}
    >
      <h2 className="text-base font-semibold text-foreground mb-2">
        Advanced Lens features
      </h2>
      <p className="mb-3">
        Boost engagement, custom feed creation, feed rules, and post rules are configured
        on-chain via Lens — not yet in Creative TV UI. Use the Lens dashboard for:
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>Custom feeds and feed rule contracts</li>
        <li>Post rules and moderation policies</li>
        <li>Sponsored / boost flows where supported</li>
      </ul>
      <Link
        href="https://lens.xyz/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300"
      >
        Lens documentation
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
