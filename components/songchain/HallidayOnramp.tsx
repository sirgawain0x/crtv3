"use client";

import { useCallback, useId, useState } from "react";
import { openHalliday } from "@halliday-sdk/commerce";
import { Button } from "@/components/ui/button";
import { getSongchainConfig } from "@/lib/songchain/config";
import { Wallet } from "lucide-react";

export function HallidayOnramp() {
  const containerId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const config = getSongchainConfig();

  const handleOpen = useCallback(() => {
    if (!config.hallidayApiKey) return;
    setOpen(true);
    openHalliday({
      apiKey: config.hallidayApiKey,
      destinationChainId: config.hallidayDestinationChainId,
      destinationTokenAddress: config.hallidayDestinationTokenAddress,
      services: ["ONRAMP"],
      windowType: "EMBED",
      targetElementId: containerId,
    });
  }, [config, containerId]);

  if (!config.hallidayApiKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Fund your Lens wallet with GHO via Halliday — set{" "}
        <code className="text-xs">NEXT_PUBLIC_HALLIDAY_API_KEY</code> to enable.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-violet-400" aria-hidden />
            Fund on Lens Chain
          </h3>
          <p className="text-sm text-muted-foreground">
            Halliday onramp for GHO on Lens — powered by Alchemy RPC in this app.
          </p>
        </div>
        {!open && (
          <Button type="button" variant="secondary" size="sm" onClick={handleOpen}>
            Get GHO
          </Button>
        )}
      </div>
      {open && (
        <div
          id={containerId}
          className="min-h-[420px] w-full overflow-hidden rounded-md border border-border/40 bg-muted/20"
        />
      )}
    </div>
  );
}
