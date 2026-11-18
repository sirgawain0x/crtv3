import "server-only";
import jwt from "jsonwebtoken";
import type { PlaybackInfoResult } from "../types";
import { frameworksPlayHlsUrl } from "./constants";

export type ResolveViewerEndpointQuery = {
  resolveViewerEndpoint: {
    primary?: {
      url?: string;
      protocol?: string;
      baseUrl?: string;
      outputs?: Record<string, { protocol?: string; url?: string }>;
    } | null;
    fallbacks?: Array<{ url?: string; protocol?: string }>;
    metadata?: {
      status?: string;
      isLive?: boolean;
      title?: string;
      contentId?: string;
      contentType?: string;
    };
  } | null;
};

function isHlsProtocol(protocol: string | undefined): boolean {
  return protocol?.toUpperCase() === "HLS";
}

function isM3u8Url(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return /\.m3u8(?:\?|#|$)/i.test(url);
  }
}

function isHlsPlaybackUrl(url: string | undefined, protocol?: string): boolean {
  if (!url) return false;
  if (isHlsProtocol(protocol)) return true;
  return isM3u8Url(url);
}

/**
 * Maps a resolveViewerEndpoint catalog entry to an HLS URL only.
 * Intended for browser-side resolve (#405 app layer); server playback uses Foghorn /play.
 */
export function pickHlsUrl(data: ResolveViewerEndpointQuery): string | undefined {
  const primary = data.resolveViewerEndpoint?.primary;
  const hlsOutput = primary?.outputs?.HLS;
  if (hlsOutput?.url) {
    return hlsOutput.url;
  }
  if (primary?.url && isHlsPlaybackUrl(primary.url, primary.protocol)) {
    return primary.url;
  }
  const outputs = primary?.outputs;
  if (outputs) {
    for (const value of Object.values(outputs)) {
      if (value?.url && isHlsPlaybackUrl(value.url, value.protocol)) {
        return value.url;
      }
    }
  }
  const fallback = data.resolveViewerEndpoint?.fallbacks?.find((f) =>
    isHlsPlaybackUrl(f.url, f.protocol),
  );
  return fallback?.url;
}

function viewerPlayHlsUrl(playbackId: string, jwtToken: string | null): string {
  const url = frameworksPlayHlsUrl(playbackId);
  if (!jwtToken) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("jwt", jwtToken);
  return parsed.toString();
}

function toPlaybackInfo(playbackId: string, hlsUrl?: string): PlaybackInfoResult {
  const url = hlsUrl ?? frameworksPlayHlsUrl(playbackId);
  return {
    playbackInfo: {
      meta: {
        source: [
          {
            type: "application/x-mpegURL",
            url,
          },
        ],
      },
    },
  };
}

export type FrameworksPlaybackTokenOptions = {
  subject?: string;
  audience?: string | string[];
  expiresInSeconds?: number;
  claims?: Record<string, unknown>;
};

function resolveSigningMaterial(): { privateKey: string; kid: string } | null {
  const privateKeyEnv = process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY?.trim();
  const kid = process.env.FRAMEWORKS_SIGNING_KID?.trim();
  if (!privateKeyEnv) {
    console.warn("[frameworks] playback JWT signing disabled: FRAMEWORKS_SIGNING_PRIVATE_KEY is unset");
    return null;
  }
  if (!kid) {
    console.warn("[frameworks] playback JWT signing disabled: FRAMEWORKS_SIGNING_KID is unset");
    return null;
  }
  return {
    privateKey: privateKeyEnv.replace(/\\n/g, "\n"),
    kid,
  };
}

/** ES256 viewer JWT for gated playback (env: FRAMEWORKS_SIGNING_*). */
export function signFrameworksPlaybackToken(
  options: FrameworksPlaybackTokenOptions = {},
): string | null {
  const material = resolveSigningMaterial();
  if (!material) return null;

  const expiresIn = options.expiresInSeconds ?? 300;
  const payload: jwt.JwtPayload = {
    sub: options.subject ?? "viewer",
    ...(options.claims ?? {}),
  };
  if (options.audience) {
    payload.aud = options.audience;
  }

  try {
    return jwt.sign(payload, material.privateKey, {
      algorithm: "ES256",
      keyid: material.kid,
      expiresIn,
    });
  } catch (err) {
    console.error("[frameworks] playback JWT signing failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export type AuthorizedFrameworksPlaybackTokenInput = {
  /** Playback ID the caller has already authorized for this viewer session. */
  playbackId: string;
  subject?: string;
  expiresInSeconds?: number;
};

/**
 * Mint a viewer JWT scoped to a single playback ID (`aud` = playbackId).
 * Call only from code paths that have already verified the viewer may access this content.
 */
export function signAuthorizedFrameworksPlaybackToken(
  input: AuthorizedFrameworksPlaybackTokenInput,
): string | null {
  const playbackId = input.playbackId.trim();
  if (!playbackId) return null;
  return signFrameworksPlaybackToken({
    subject: input.subject,
    audience: playbackId,
    expiresInSeconds: input.expiresInSeconds,
  });
}

/** Foghorn /play HLS URL with an authorized viewer JWT when signing is configured. */
export function buildAuthorizedViewerPlayHlsUrl(
  input: AuthorizedFrameworksPlaybackTokenInput,
): string {
  const playbackId = input.playbackId.trim();
  const token = signAuthorizedFrameworksPlaybackToken(input);
  return viewerPlayHlsUrl(playbackId, token);
}

export const frameworksPlayback = {
  get: async (playbackId: string): Promise<PlaybackInfoResult> => {
    const url = viewerPlayHlsUrl(playbackId, null);
    return toPlaybackInfo(playbackId, url);
  },
};