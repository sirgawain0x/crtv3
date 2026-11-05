"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { O1_BASE_STOCK_TOKENS } from "@/lib/creator-stock-picks/o1-base-stock-catalog";
import type { CreatorStockPickStored } from "@/lib/creator-stock-picks/validate-stock-pick";
import { useChain } from "@account-kit/react";
import { isCreatorStockPicksChainAllowed } from "@/lib/creator-stock-picks/feature-flag";

export type StockPickEditorValue = {
  ticker: string;
  note: string;
  video_asset_id: string;
};

type CreatorStockPickEditorProps = {
  initial: CreatorStockPickStored | null;
  disabled?: boolean;
  onChange: (value: StockPickEditorValue) => void;
};

export function CreatorStockPickEditor({
  initial,
  disabled,
  onChange,
}: CreatorStockPickEditorProps) {
  const { chain } = useChain();
  const chainId = chain?.id;
  const enabled = isCreatorStockPicksChainAllowed(chainId);
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [videoAssetId, setVideoAssetId] = useState(
    initial?.video_asset_id ?? "",
  );

  const previewUrl = useMemo(() => {
    const token = O1_BASE_STOCK_TOKENS.find((t) => t.ticker === ticker);
    if (!token) {
      return null;
    }
    const params = new URLSearchParams({
      chainId: "8453",
      inputCurrency: token.address,
    });
    return `https://o1.exchange/swap?${params.toString()}`;
  }, [ticker]);

  if (!enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        Creator Stock Picks are disabled. Enable{" "}
        <code className="text-[11px]">NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED=true</code>{" "}
        on Base Sepolia only (testnet).
      </p>
    );
  }

  const emit = (next: Partial<StockPickEditorValue>) => {
    const value = {
      ticker: next.ticker ?? ticker,
      note: next.note ?? note,
      video_asset_id: next.video_asset_id ?? videoAssetId,
    };
    onChange(value);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <Label htmlFor="stock-pick-ticker">o1 Base stock token</Label>
        <Select
          value={ticker || "__none__"}
          onValueChange={(v) => {
            const next = v === "__none__" ? "" : v;
            setTicker(next);
            emit({ ticker: next });
          }}
          disabled={disabled}
        >
          <SelectTrigger id="stock-pick-ticker" className="mt-2">
            <SelectValue placeholder="Select one token" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {O1_BASE_STOCK_TOKENS.map((token) => (
              <SelectItem key={token.address} value={token.ticker}>
                {token.ticker} — {token.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stock-pick-note">Short note (optional)</Label>
        <Textarea
          id="stock-pick-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            emit({ note: e.target.value });
          }}
          disabled={disabled || !ticker}
          rows={3}
          placeholder="Why you are highlighting this token (not investment advice)."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stock-pick-video">Video asset id (optional)</Label>
        <Input
          id="stock-pick-video"
          value={videoAssetId}
          onChange={(e) => {
            setVideoAssetId(e.target.value);
            emit({ video_asset_id: e.target.value });
          }}
          disabled={disabled || !ticker}
          placeholder="UUID of your uploaded video"
        />
      </div>

      {previewUrl ? (
        <p className="text-xs text-muted-foreground break-all">
          Partner link preview: {previewUrl}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground leading-snug">
        No issuer endorsement or shareholder rights. External partner only — not
        financial advice.
      </p>
    </div>
  );
}
