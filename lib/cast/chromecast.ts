import {
  DEFAULT_MEDIA_RECEIVER_APP_ID,
  type CastContextLike,
  type CastSessionLike,
} from "./chromecast-types";

const CAST_SDK_URL =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

let sdkLoadPromise: Promise<boolean> | null = null;
let contextInitialized = false;

function getCastContext(): CastContextLike | null {
  return window.cast?.framework?.CastContext?.getInstance() ?? null;
}

function initializeCastContext(): boolean {
  const context = getCastContext();
  const autoJoin = window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED;
  if (!context || autoJoin === undefined) return false;
  if (contextInitialized) return true;

  context.setOptions({
    receiverApplicationId: DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: autoJoin,
  });
  contextInitialized = true;
  return true;
}

export function loadChromecastSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.cast?.framework) {
    return Promise.resolve(initializeCastContext());
  }
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://www.gstatic.com/cv/js/sender/"]`,
    );
    if (existing) {
      const onReady = () => resolve(initializeCastContext());
      if (window.cast?.framework) {
        onReady();
        return;
      }
      window.__onGCastApiAvailable = (isAvailable) => {
        resolve(isAvailable && initializeCastContext());
      };
      return;
    }

    window.__onGCastApiAvailable = (isAvailable) => {
      resolve(isAvailable && initializeCastContext());
    };

    const script = document.createElement("script");
    script.src = CAST_SDK_URL;
    script.async = true;
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export function isChromecastAvailable(): boolean {
  const context = getCastContext();
  if (!context) return false;
  const state = context.getCastState();
  const CastState = window.cast?.framework?.CastState;
  if (!CastState) return false;
  return state !== CastState.NO_DEVICES_AVAILABLE;
}

export type CastMediaPayload = {
  contentUrl: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  isLive?: boolean;
};

export async function startChromecastSession(
  payload: CastMediaPayload,
): Promise<CastSessionLike> {
  const ready = await loadChromecastSdk();
  if (!ready) {
    throw new Error("Chromecast is not available on this device");
  }

  const context = getCastContext();
  if (!context) {
    throw new Error("Chromecast framework failed to initialize");
  }

  let session = context.getCurrentSession();
  if (!session) {
    session = await context.requestSession();
  }

  const streamType =
    payload.isLive
      ? window.chrome?.cast?.media?.StreamType?.LIVE ?? "LIVE"
      : window.chrome?.cast?.media?.StreamType?.BUFFERED ?? "BUFFERED";

  await session.loadMedia({
    media: {
      contentId: payload.contentUrl,
      contentType: "application/x-mpegURL",
      streamType,
      metadata: {
        title: payload.title,
        subtitle: payload.subtitle,
        images: payload.posterUrl ? [{ url: payload.posterUrl }] : undefined,
      },
    },
    autoplay: true,
  });

  return session;
}
