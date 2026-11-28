/**
 * FrameWorks playback signing and URL construction — Node-safe.
 *
 * The app-facing `./playback.ts` keeps the `server-only` marker so a client
 * component cannot bundle it. That marker is a build-time guard for Next.js and
 * throws when imported by a plain Node process (an operator CLI, for example), so
 * the signing logic lives here instead: it is guarded at call time by
 * `assertServerContext`, which keeps the same intent without breaking Node.
 *
 * Import this from server code and CLIs; import `./playback` from app code.
 */

import jwt from 'jsonwebtoken';
import { FrameworksPlaybackSigningError } from '../errors';
import { frameworksPlayHlsUrl } from './constants';

/** Signing must never run in a browser bundle. */
function assertServerContext(): void {
  if (typeof window !== 'undefined') {
    throw new Error('FrameWorks playback signing must not run in a browser');
  }
}

function viewerPlayHlsUrl(playbackId: string, jwtToken: string): string {
  const url = frameworksPlayHlsUrl(playbackId);
  const parsed = new URL(url);
  parsed.searchParams.set('jwt', jwtToken);
  return parsed.toString();
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
    console.warn('[frameworks] playback JWT signing disabled: FRAMEWORKS_SIGNING_PRIVATE_KEY is unset');
    return null;
  }
  if (!kid) {
    console.warn('[frameworks] playback JWT signing disabled: FRAMEWORKS_SIGNING_KID is unset');
    return null;
  }
  return {
    privateKey: privateKeyEnv.replace(/\\n/g, '\n'),
    kid,
  };
}

/** ES256 viewer JWT for gated playback (env: FRAMEWORKS_SIGNING_*). */
export function signFrameworksPlaybackToken(
  options: FrameworksPlaybackTokenOptions = {},
): string | null {
  assertServerContext();
  const material = resolveSigningMaterial();
  if (!material) return null;

  const expiresIn = options.expiresInSeconds ?? 300;
  const payload: jwt.JwtPayload = {
    sub: options.subject ?? 'viewer',
    ...(options.claims ?? {}),
  };
  if (options.audience) {
    payload.aud = options.audience;
  }

  try {
    return jwt.sign(payload, material.privateKey, {
      algorithm: 'ES256',
      keyid: material.kid,
      expiresIn,
    });
  } catch (err) {
    console.error('[frameworks] playback JWT signing failed', {
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
    throw new FrameworksPlaybackSigningError('invalid_playback_id');
  }
  const token = signAuthorizedFrameworksPlaybackToken(input);
  if (!token) {
    throw new FrameworksPlaybackSigningError('signing_unavailable');
  }
  return viewerPlayHlsUrl(playbackId, token);
}
