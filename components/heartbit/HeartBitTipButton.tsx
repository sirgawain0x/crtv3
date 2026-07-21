"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Address,
  createPublicClient,
  http,
} from "viem";
import { base } from "viem/chains";
import { Heart, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CAMPAIGN_STICKERS_ADDRESS,
  campaignStickersAbi,
} from "@/lib/contracts/CampaignStickers";
import { useHeartBit } from "@/components/heartbit/HeartBitProvider";
import { useVideoTip } from "@/lib/hooks/video/useVideoTip";
import { useSmartAccountClient } from "@/lib/wallet/react";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { buildCompositeHash } from "@/lib/sdk/heartbit/client";
import { USDC_TIP_RATE_PER_SECOND } from "@/lib/sdk/heartbit/config";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";

type StickerOption = {
  token_id: number;
  ipfs_hash: string;
  name: string | null;
  image_uri: string | null;
  balance: bigint;
};

type HeartBitTipButtonProps = {
  videoId: string;
  videoIpfsHash?: string | null;
  creatorAddress: string;
  className?: string;
};

function ipfsToHttp(uri: string | null | undefined): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

export function HeartBitTipButton({
  videoId,
  videoIpfsHash,
  creatorAddress,
  className,
}: HeartBitTipButtonProps) {
  const { address } = useSmartAccountClient({});
  const { mintHeartBit } = useHeartBit();
  const { sendTip, isTipping } = useVideoTip();
  const { getAuthHeaders } = useWalletAuth();

  const [stickers, setStickers] = useState<StickerOption[]>([]);
  const [selected, setSelected] = useState<StickerOption | null>(null);
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoHash = videoIpfsHash || `playback:${videoId}`;

  const tipUsd = useMemo(
    () => Number((elapsed * USDC_TIP_RATE_PER_SECOND).toFixed(2)),
    [elapsed]
  );

  const loadInventory = useCallback(async () => {
    if (!address) {
      setStickers([]);
      return;
    }
    try {
      const res = await fetch("/api/stickers/list");
      if (!res.ok) {
        throw new Error(`Failed to load stickers (${res.status})`);
      }
      const json = await res.json();
      const rows = (json.stickers ?? []) as Array<{
        token_id: number;
        ipfs_hash: string;
        name: string | null;
        image_uri: string | null;
      }>;

      if (
        !rows.length ||
        !CAMPAIGN_STICKERS_ADDRESS ||
        CAMPAIGN_STICKERS_ADDRESS ===
          "0x0000000000000000000000000000000000000000"
      ) {
        setStickers([]);
        return;
      }

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const accounts = rows.map(() => address as Address);
      const ids = rows.map((r) => BigInt(r.token_id));
      const balances = (await publicClient.readContract({
        address: CAMPAIGN_STICKERS_ADDRESS,
        abi: campaignStickersAbi,
        functionName: "balanceOfBatch",
        args: [accounts, ids],
      })) as bigint[];

      const owned: StickerOption[] = rows
        .map((r, i) => ({
          ...r,
          balance: balances[i] ?? 0n,
        }))
        .filter((r) => r.balance > 0n);

      setStickers(owned);
      setSelected((prev) => prev ?? owned[0] ?? null);
    } catch (err) {
      logger.debug("sticker inventory load failed:", err);
    }
  }, [address]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const stopTimer = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    if (!address || !selected || isTipping) return;
    const start = Math.floor(Date.now() / 1000);
    startTimeRef.current = start;
    setHolding(true);
    setElapsed(0);
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor(Date.now() / 1000) - start);
    }, 200);
  }, [address, selected, isTipping]);

  const onPointerUp = useCallback(async () => {
    stopTimer();
    setHolding(false);
    const start = startTimeRef.current;
    startTimeRef.current = null;
    if (!start || !address || !selected) return;

    const endTime = Math.floor(Date.now() / 1000);
    const seconds = Math.max(1, endTime - start);
    const usdcAmount = Number((seconds * USDC_TIP_RATE_PER_SECOND).toFixed(2));
    setElapsed(seconds);

    if (usdcAmount < 0.01) {
      toast.message("Hold a bit longer to tip at least $0.01");
      return;
    }

    const compositeHash = buildCompositeHash(videoHash, selected.ipfs_hash);

    try {
      const [tipResult] = await Promise.all([
        sendTip(usdcAmount.toFixed(2), "USDC", creatorAddress),
        mintHeartBit({
          startTime: start,
          endTime,
          hash: compositeHash,
          account: address,
        }).catch((err) => {
          logger.warn("HeartBit mint failed (USDC tip may still succeed):", err);
          return null;
        }),
      ]);

      const authHeaders = await getAuthHeaders();
      const tipRecordRes = await fetch("/api/stickers/tips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          videoId,
          wallet: address,
          stickerTokenId: selected.token_id,
          stickerIpfsHash: selected.ipfs_hash,
          compositeHash,
          seconds,
          usdcAmount,
          txHash: tipResult?.txHash,
        }),
      });
      const tipRecordJson = await tipRecordRes.json().catch(() => ({}));
      if (!tipRecordRes.ok) {
        const recordError =
          typeof tipRecordJson.error === "string"
            ? tipRecordJson.error
            : "Failed to record tip in ledger";
        // USDC may already have left the wallet — surface that clearly.
        if (tipResult) {
          logger.error("tip ledger record failed after USDC tip:", tipRecordJson);
          toast.warning(
            `Sent $${usdcAmount.toFixed(2)} USDC, but tip ledger failed: ${recordError}`
          );
        } else {
          throw new Error(recordError);
        }
      } else if (tipResult) {
        toast.success(`Tipped $${usdcAmount.toFixed(2)} USDC with sticker`);
      }
    } catch (err) {
      logger.error("hold-to-tip failed:", err);
      toast.error(err instanceof Error ? err.message : "Tip failed");
    } finally {
      setElapsed(0);
    }
  }, [
    stopTimer,
    address,
    selected,
    videoHash,
    sendTip,
    creatorAddress,
    mintHeartBit,
    videoId,
    getAuthHeaders,
  ]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  if (!address) {
    return null;
  }

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.image_uri && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ipfsToHttp(selected.image_uri)}
                    alt=""
                    className="h-5 w-5 rounded object-cover"
                  />
                )}
                <span className="max-w-[100px] truncate text-xs">
                  {selected.name || `#${selected.token_id}`}
                </span>
              </span>
            ) : (
              <span className="text-xs">Pick sticker</span>
            )}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-56 overflow-y-auto">
          {stickers.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No campaign stickers in this wallet. Vote and claim one first.
            </div>
          ) : (
            stickers.map((s) => (
              <DropdownMenuItem
                key={s.token_id}
                onClick={() => setSelected(s)}
                className="gap-2"
              >
                {s.image_uri && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ipfsToHttp(s.image_uri)}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
                )}
                <span className="truncate">{s.name || `Sticker #${s.token_id}`}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative">
        {holding && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
            ${tipUsd.toFixed(2)} · {elapsed}s
          </div>
        )}
        <Button
          type="button"
          size="icon"
          variant={holding ? "default" : "secondary"}
          className={cn(
            "h-10 w-10 rounded-full select-none touch-none",
            holding && "bg-pink-600 hover:bg-pink-600 scale-110"
          )}
          disabled={!selected || isTipping}
          onPointerDown={(e) => {
            e.preventDefault();
            onPointerDown();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            void onPointerUp();
          }}
          onPointerLeave={() => {
            if (holding) void onPointerUp();
          }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Hold to tip with sticker"
        >
          <Heart className={cn("h-5 w-5", holding && "fill-current")} />
        </Button>
      </div>
    </div>
  );
}
