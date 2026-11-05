"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { CreatorStockPickStored } from "@/lib/creator-stock-picks/validate-stock-pick";
import { getO1BaseStockTokenByTicker } from "@/lib/creator-stock-picks/o1-base-stock-catalog";

const DISCLAIMER =
  "External partner link — not financial advice. Tokenized stocks do not confer shareholder rights or issuer endorsement (o1 terms §6.7).";

type CreatorStockPickDisplayProps = {
  stockPick: CreatorStockPickStored;
  videoHref?: string | null;
};

export function CreatorStockPickDisplay({
  stockPick,
  videoHref,
}: CreatorStockPickDisplayProps) {
  const catalog = getO1BaseStockTokenByTicker(stockPick.ticker);

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Creator stock pick</h4>
        <span className="text-xs font-mono text-muted-foreground">
          {stockPick.ticker}
          {catalog ? ` · ${catalog.name}` : null}
        </span>
      </div>

      {stockPick.note ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {stockPick.note}
        </p>
      ) : null}

      {videoHref ? (
        <p className="text-sm">
          <Link href={videoHref} className="text-primary underline-offset-4 hover:underline">
            Related video
          </Link>
        </p>
      ) : null}

      <a
        href={stockPick.partner_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        View on o1 Exchange
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>

      <p className="text-xs text-muted-foreground leading-snug">{DISCLAIMER}</p>
    </div>
  );
}
