import { sendBeaconSafely, createBeaconJSONBlob } from "@/lib/utils/sendBeacon";

export type TVAnalyticsEvent =
  | "cast_start"
  | "cast_error"
  | "cast_end"
  | "session_length"
  | "airplay_start"
  | "airplay_error"
  | "tv_page_view";

export type TVAnalyticsPayload = {
  event: TVAnalyticsEvent;
  playbackId?: string;
  assetId?: string;
  title?: string;
  surface?: "tv-home" | "tv-discover" | "tv-watch" | "tv-live";
  castType?: "chromecast" | "airplay";
  errorMessage?: string;
  sessionLengthMs?: number;
  contentUrl?: string;
  timestamp?: number;
};

const ANALYTICS_ENDPOINT = "/api/tv/analytics";

export function trackTVEvent(payload: TVAnalyticsPayload): void {
  if (typeof window === "undefined") return;

  const body: TVAnalyticsPayload = {
    ...payload,
    timestamp: payload.timestamp ?? Date.now(),
  };

  const blob = createBeaconJSONBlob(body as Record<string, unknown>);
  sendBeaconSafely(ANALYTICS_ENDPOINT, blob);
}

export function startTVSessionTracker(surface: TVAnalyticsPayload["surface"]): () => void {
  const startedAt = Date.now();

  trackTVEvent({
    event: "tv_page_view",
    surface,
  });

  const flush = () => {
    trackTVEvent({
      event: "session_length",
      surface,
      sessionLengthMs: Date.now() - startedAt,
    });
  };

  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);

  return () => {
    flush();
    window.removeEventListener("pagehide", flush);
    window.removeEventListener("beforeunload", flush);
  };
}
