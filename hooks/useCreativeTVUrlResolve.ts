"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveCreativeTVPlayback,
  type ResolveCreativeTVPlaybackOptions,
  type ResolveCreativeTVPlaybackResult,
} from "@/lib/utils/resolve-creative-tv-playback";

export type CreativeTVUrlResolveState =
  | { status: "idle" }
  | { status: "loading"; input: string }
  | { status: "resolved"; input: string; result: Extract<ResolveCreativeTVPlaybackResult, { ok: true }> }
  | { status: "fallback"; input: string; result: Extract<ResolveCreativeTVPlaybackResult, { ok: false }> };

export type UseCreativeTVUrlResolveOptions = ResolveCreativeTVPlaybackOptions;

export function useCreativeTVUrlResolve(opts?: UseCreativeTVUrlResolveOptions) {
  const [state, setState] = useState<CreativeTVUrlResolveState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ status: "idle" });
  }, []);

  const resolveFromInput = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      reset();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "loading", input: trimmed });

    try {
      const result = await resolveCreativeTVPlayback(trimmed, {
        ...optsRef.current,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (result.ok) {
        const useFallback = result.requiresMetoken;
        setState(
          useFallback
            ? {
                status: "fallback",
                input: trimmed,
                result: {
                  ok: false,
                  reason: "not_found",
                  fallbackUrl: result.fallbackUrl,
                  parsed: result.parsed,
                  message: "This video requires a MeToken subscription. Open on Creative TV to watch.",
                },
              }
            : { status: "resolved", input: trimmed, result },
        );
        return;
      }

      setState({ status: "fallback", input: trimmed, result });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setState({
        status: "fallback",
        input: trimmed,
        result: {
          ok: false,
          reason: "network_error",
          message: error instanceof Error ? error.message : "Failed to resolve URL",
        },
      });
    }
  }, [reset]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const pasted = event.clipboardData.getData("text");
      if (!pasted.trim()) {
        return;
      }
      event.preventDefault();
      void resolveFromInput(pasted);
    },
    [resolveFromInput],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    state,
    resolveFromInput,
    handlePaste,
    reset,
  };
}
