"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { openHalliday } from "@halliday-sdk/commerce";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export type HallidayOnrampProps = {
  hallidayApiKey: string | null;
  destinationChainId: number;
  destinationTokenAddress: string;
};

export function HallidayOnramp({
  hallidayApiKey,
  destinationChainId,
  destinationTokenAddress,
}: HallidayOnrampProps) {
  const reactId = useId().replace(/:/g, "");
  const containerId = `halliday-onramp-${reactId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = useCallback(() => {
    if (!hallidayApiKey) return;
    setError(null);
    setOpen(true);
  }, [hallidayApiKey]);

  useLayoutEffect(() => {
    if (!open || !hallidayApiKey) return;

    const target = containerRef.current;
    if (!target) return;

    let cancelled = false;

    const mountEmbed = async () => {
      setLoading(true);
      setError(null);

      try {
        await openHalliday({
          apiKey: hallidayApiKey,
          destinationChainId,
          destinationTokenAddress,
          services: ["ONRAMP"],
          windowType: "EMBED",
          targetElementId: containerId,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load Halliday onramp. Try again or use popup mode.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void mountEmbed();

    return () => {
      cancelled = true;
      target.innerHTML = "";
    };
  }, [
    open,
    containerId,
    hallidayApiKey,
    destinationChainId,
    destinationTokenAddress,
  ]);

  const handlePopup = useCallback(async () => {
    if (!hallidayApiKey) return;
    setError(null);
    try {
      await openHalliday({
        apiKey: hallidayApiKey,
        destinationChainId,
        destinationTokenAddress,
        services: ["ONRAMP"],
        windowType: "POPUP",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open Halliday popup.");
    }
  }, [hallidayApiKey, destinationChainId, destinationTokenAddress]);

  if (!hallidayApiKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Fund your Lens wallet with GHO via Halliday — set{" "}
        <code className="text-xs">NEXT_PUBLIC_HALLIDAY_API_KEY</code> (or{" "}
        <code className="text-xs">HALLIDAY_API_KEY</code> on the server) to enable.
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleOpen}>
              Get GHO
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handlePopup()}>
              Open in popup
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void handlePopup()}
          >
            Try popup
          </button>
        </p>
      )}

      {open && (
        <div
          ref={containerRef}
          id={containerId}
          className="relative min-h-[420px] w-full overflow-hidden rounded-md border border-border/40 bg-muted/20"
          aria-busy={loading}
        >
          {loading && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading Halliday…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
