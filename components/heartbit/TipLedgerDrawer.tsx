"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ListOrdered } from "lucide-react";
import { shortenAddress } from "@/lib/utils/utils";

type TipRow = {
  id: string;
  wallet: string;
  sticker_token_id: number | null;
  sticker_ipfs_hash: string | null;
  seconds: number;
  usdc_amount: number;
  tx_hash: string | null;
  created_at: string;
};

type TipLedgerDrawerProps = {
  videoId: string;
};

export function TipLedgerDrawer({ videoId }: TipLedgerDrawerProps) {
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState<TipRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stickers/tips?videoId=${encodeURIComponent(videoId)}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load tip ledger (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) setTips(json.tips ?? []);
      } catch {
        if (!cancelled) setTips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, videoId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5">
          <ListOrdered className="h-4 w-4" />
          Tip ledger
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sticker tip ledger</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sticker tips yet for this video.
            </p>
          ) : (
            <div className="rounded-md border divide-y">
              <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>When</span>
                <span>Fan</span>
                <span>Sticker</span>
                <span className="text-right">USDC</span>
              </div>
              {tips.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-4 gap-2 px-3 py-2 text-xs items-center"
                >
                  <span className="whitespace-nowrap">
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                  <span className="font-mono">{shortenAddress(t.wallet)}</span>
                  <span>
                    {t.sticker_token_id != null ? `#${t.sticker_token_id}` : "—"}
                    <span className="block text-muted-foreground">
                      {t.seconds}s
                    </span>
                  </span>
                  <span className="text-right font-medium">
                    ${Number(t.usdc_amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
