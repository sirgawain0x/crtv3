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
            <div className="rounded-md border">
              {/** Desktop / wide table — swipeable on small screens */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">When</th>
                      <th className="px-3 py-2 text-left font-medium">Fan</th>
                      <th className="px-3 py-2 text-left font-medium">Sticker</th>
                      <th className="px-3 py-2 text-right font-medium">USDC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tips.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap px-3 py-2">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {shortenAddress(t.wallet)}
                        </td>
                        <td className="px-3 py-2">
                          {t.sticker_token_id != null ? `#${t.sticker_token_id}` : "—"}
                          <span className="block text-muted-foreground">
                            {t.seconds}s
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ${Number(t.usdc_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/** Mobile card view — only visible on narrow screens */}
              <div className="sm:hidden">
                {tips.map((t) => (
                  <div
                    key={t.id}
                    className="border-b p-3 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-muted-foreground">
                        {shortenAddress(t.wallet)}
                      </span>
                      <span className="font-semibold text-pink-600">
                        ${Number(t.usdc_amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs">
                      Sticker:{" "}
                      <span className="font-medium">
                        {t.sticker_token_id != null ? `#${t.sticker_token_id}` : "—"}
                      </span>
                      <span className="ml-3 text-muted-foreground">{t.seconds}s held</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
