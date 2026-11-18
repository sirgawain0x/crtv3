import "server-only";
import jwt from "jsonwebtoken";
import type { PlaybackInfoResult } from "../types";
import { FrameworksPlaybackSigningError } from "../errors";
import { frameworksPlayHlsUrl } from "./constants";

function viewerPlayHlsUrl(playbackId: string, jwtToken: string): string {
  const url = frameworksPlayHlsUrl(playbackId);
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

/**
 * Foghorn /play HLS URL with a scoped viewer JWT.
 * Throws {@link FrameworksPlaybackSigningError} when signing is unavailable — never returns unsigned.
 */
export function buildAuthorizedViewerPlayHlsUrl(
  input: AuthorizedFrameworksPlaybackTokenInput,
): string {
  const playbackId = input.playbackId.trim();
  if (!playbackId) {
    throw new FrameworksPlaybackSigningError("invalid_playback_id");
  }
  const token = signAuthorizedFrameworksPlaybackToken(input);
  if (!token) {
    throw new FrameworksPlaybackSigningError("signing_unavailable");
  }
  return viewerPlayHlsUrl(playbackId, token);
}

function unsignedViewerPlayHlsUrl(playbackId: string): string {
  return frameworksPlayHlsUrl(playbackId);
}

export const frameworksPlayback = {
  get: async (playbackId: string): Promise<PlaybackInfoResult> => {
    const url = unsignedViewerPlayHlsUrl(playbackId);
    return toPlaybackInfo(playbackId, url);
  },
};