"use client";

import { useState } from "react";
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
import { O1_BASE_SEPOLIA_STOCK_CATALOG } from "@/lib/creator-stock-picks/sepolia-stock-catalog";
import type { CreatorStockPickStored } from "@/lib/creator-stock-picks/validate-stock-pick";
import {
  getCreatorStockPicksBlocker,
  isCreatorStockPicksRuntimeEnabled,
} from "@/lib/creator-stock-picks/runtime-policy";

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

const BLOCKER_COPY: Record<string, string> = {
  feature_flag_off:
    "Disabled (default). Set NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED=true on a non-production deployment to test.",
  production_deployment:
    "Disabled on production deployments (fail-closed).",
  no_verified_sepolia_catalog:
    "Blocked: no official o1 Base Sepolia stock catalog yet. Mainnet quotes must not be used on Sepolia.",
};

export function CreatorStockPickEditor({
  initial,
  disabled,
  onChange,
}: CreatorStockPickEditorProps) {
  const enabled = isCreatorStockPicksRuntimeEnabled();
  const blocker = getCreatorStockPicksBlocker();
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [videoAssetId, setVideoAssetId] = useState(
    initial?.video_asset_id ?? "",
  );

  if (!enabled) {
    return (
      <p className="text-xs text-muted-foreground leading-snug">
        {blocker ? BLOCKER_COPY[blocker] : "Creator Stock Picks unavailable."}
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
        <Label htmlFor="stock-pick-ticker">o1 Base Sepolia stock token</Label>
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
            {O1_BASE_SEPOLIA_STOCK_CATALOG.map((token) => (
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

      <p className="text-xs text-muted-foreground leading-snug">
        No issuer endorsement or shareholder rights. External partner only — not
        financial advice.
      </p>
    </div>
  );
}
