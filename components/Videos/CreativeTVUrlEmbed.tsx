"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Player, PlayerLoading } from "@/components/Player/Player";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { useCreativeTVUrlResolve } from "@/hooks/useCreativeTVUrlResolve";
import { getCreativeTVEmbedUrlForParsed } from "@/lib/utils/creative-tv-url";
import type { Src } from "@livepeer/react";
import { logger } from "@/lib/utils/logger";

export type CreativeTVUrlEmbedProps = {
  /** Optional API origin for cross-origin playback resolution. */
  apiBaseUrl?: string;
  /** Optional site origin for fallback link/iframe targets. */
  siteOrigin?: string;
  className?: string;
  placeholder?: string;
};

export function CreativeTVUrlEmbed({
  apiBaseUrl,
  siteOrigin,
  className,
  placeholder = "Paste a Creative TV discover or watch URL",
}: CreativeTVUrlEmbedProps) {
  const [inputValue, setInputValue] = useState("");
  const [playbackSources, setPlaybackSources] = useState<Src[] | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const { state, resolveFromInput, handlePaste, reset } = useCreativeTVUrlResolve({
    apiBaseUrl,
    siteOrigin,
  });

  useEffect(() => {
    if (state.status !== "resolved") {
      setPlaybackSources(null);
      setPlayerError(null);
      return;
    }

    const playbackId = state.result.playbackId;
    let cancelled = false;

    async function loadSources() {
      try {
        const sources = await getDetailPlaybackSource(playbackId);
        if (!cancelled) {
          setPlaybackSources(sources);
          if (!sources?.length) {
            setPlayerError("Unable to load playback sources.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("[CreativeTVUrlEmbed] Failed to load playback sources:", error);
          setPlayerError("Unable to load playback sources.");
        }
      }
    }

    void loadSources();

    return () => {
      cancelled = true;
    };
  }, [state]);

  const fallbackUrl =
    state.status === "resolved"
      ? state.result.fallbackUrl
      : state.status === "fallback"
        ? state.result.fallbackUrl
        : undefined;

  const iframeSrc = useMemo(() => {
    const parsed =
      state.status === "resolved"
        ? state.result.parsed
        : state.status === "fallback"
          ? state.result.parsed
          : undefined;

    if (parsed) {
      return getCreativeTVEmbedUrlForParsed(parsed, { origin: siteOrigin }) ?? fallbackUrl;
    }

    return fallbackUrl;
  }, [state, siteOrigin, fallbackUrl]);

  const showIframeFallback =
    state.status === "fallback" ||
    (state.status === "resolved" && (Boolean(playerError) || !playbackSources?.length));

  const resolvedTitle =
    state.status === "resolved" ? state.result.title ?? "Creative TV Video" : "Creative TV Video";

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (pasted.trim()) {
              setInputValue(pasted);
            }
            handlePaste(event);
          }}
          placeholder={placeholder}
          aria-label="Creative TV video URL"
        />
        <Button
          type="button"
          onClick={() => void resolveFromInput(inputValue)}
          disabled={!inputValue.trim() || state.status === "loading"}
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resolving
            </>
          ) : (
            "Embed"
          )}
        </Button>
        {state.status !== "idle" ? (
          <Button type="button" variant="outline" onClick={() => {
            reset();
            setInputValue("");
            setPlaybackSources(null);
            setPlayerError(null);
          }}>
            Clear
          </Button>
        ) : null}
      </div>

      {state.status === "fallback" && state.result.message ? (
        <Alert className="mt-3">
          <AlertDescription>{state.result.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "loading" ? (
        <div className="mt-4">
          <PlayerLoading title="Resolving Creative TV URL..." />
        </div>
      ) : null}

      {state.status === "resolved" && !showIframeFallback ? (
        <div className="mt-4 overflow-hidden rounded-lg border">
          {playbackSources ? (
            <Player
              src={playbackSources}
              title={resolvedTitle}
              playbackId={state.result.playbackId}
            />
          ) : (
            <PlayerLoading title="Loading playback..." />
          )}
        </div>
      ) : null}

      {showIframeFallback && iframeSrc ? (
        <div className="mt-4 space-y-3">
          <div className="overflow-hidden rounded-lg border">
            <iframe
              src={iframeSrc}
              title="Creative TV video"
              className="aspect-video w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              loading="lazy"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            {fallbackUrl ? (
              <Link href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Open on Creative TV
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.status === "fallback" && !fallbackUrl ? (
        <Alert className="mt-3" variant="destructive">
          <AlertDescription>
            {state.result.message ?? "Could not resolve that URL. Paste a /discover or /watch link."}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
