"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamHealthCardProps {
  playbackId: string | null;
}

export function StreamHealthCard({ playbackId }: StreamHealthCardProps) {
  const [state, setState] = useState<{
    isLive: boolean;
    loading: boolean;
    error: string | null;
  }>({ isLive: false, loading: !!playbackId, error: null });

  useEffect(() => {
    if (!playbackId) {
      setState({ isLive: false, loading: false, error: null });
      return;
    }

    let active = true;
    async function check() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(`/api/streams/${encodeURIComponent(playbackId ?? "")}/live-status`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as { isLive?: boolean };
        if (!active) return;
        setState({ isLive: Boolean(data.isLive), loading: false, error: null });
      } catch (err) {
        if (!active) return;
        setState({ isLive: false, loading: false, error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    check();
    const id = setInterval(check, 15_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [playbackId]);

  const status = state.loading
    ? { icon: Radio, text: "Checking ingest…", color: "text-yellow-400", bg: "bg-yellow-500/10" }
    : state.error
    ? { icon: AlertCircle, text: `Health check error: ${state.error}`, color: "text-orange-400", bg: "bg-orange-500/10" }
    : state.isLive
    ? { icon: Wifi, text: "Ingest active — stream is live", color: "text-green-400", bg: "bg-green-500/10" }
    : { icon: WifiOff, text: "No ingest detected — stream is idle", color: "text-gray-400", bg: "bg-gray-500/10" };

  const Icon = status.icon;

  return (
    <Card className={cn("w-full", status.bg)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={cn("h-4 w-4", status.color)} />
          <span className={status.color}>{status.text}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {playbackId
            ? "This card reflects Livepeer ingest state, independent of the page headline."
            : "Create a stream to see ingest health."}
        </p>
      </CardContent>
    </Card>
  );
}
