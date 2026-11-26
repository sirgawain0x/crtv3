import { getSrc } from "@livepeer/react/external";
import { Src } from "@livepeer/react";
import { logger } from '@/lib/utils/logger';

const MAX_429_RETRIES = 3;
export class PlaybackAuthorizationError extends Error {
  constructor(public status: number) { super('Playback wallet verification required'); this.name='PlaybackAuthorizationError'; }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPlaybackInfo(
  id: string,
  signal?: AbortSignal,
  authHeaders?: Record<string, string>,
  companionAddress?: string,
): Promise<Response> {
  const query = new URLSearchParams({ playbackId: id });
  if (companionAddress) query.set('companionAddress', companionAddress);
  const internalUrl = `/api/internal/playback-info?${query}`;

  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const response = await fetch(internalUrl, {
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    // If the internal endpoint somehow 404s (e.g. route not deployed), fall
    // back to the public route so a missing /api/internal path doesn't break
    // older deploy previews.
    if (response.status === 404 && attempt === 0) {
      logger.warn(
        `[getDetailPlaybackSource] Internal playback-info not found for ${id}; falling back to public route`,
      );
      const publicResponse = await fetch(`/api/livepeer/playback-info?${query}`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
      if (publicResponse.status !== 429) {
        return publicResponse;
      }
    }

    if (response.status !== 429 || attempt === MAX_429_RETRIES) {
      return response;
    }

    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : Number.NaN;
    const waitMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : Math.min(1000 * 2 ** attempt, 8000);

    logger.warn(
      `[getDetailPlaybackSource] Rate limited for ${id}; retrying in ${waitMs}ms`,
    );
    await sleep(waitMs);
  }

  throw new Error('Unreachable playback fetch retry state');
}

export const getDetailPlaybackSource = async (
  id: string,
  opts?: { signal?: AbortSignal; authHeaders?: Record<string, string>; companionAddress?: string }
): Promise<Src[] | null> => {
  try {
    logger.debug("[getDetailPlaybackSource] Fetching for ID:", id);

    const response = await fetchPlaybackInfo(id, opts?.signal, opts?.authHeaders, opts?.companionAddress);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new PlaybackAuthorizationError(response.status);
      if (response.status === 429) {
        logger.warn(
          "[getDetailPlaybackSource] Rate limit persisted for ID:",
          id,
        );
      } else {
        logger.error(
          "[getDetailPlaybackSource] HTTP error for ID:",
          id,
          response.status,
        );
      }
      return null;
    }

    const res = await response.json();
    const meta = res?.meta as
      | { live?: number; source?: Array<{ hrn?: string; type?: string }> }
      | undefined;
    logger.info("[getDetailPlaybackSource] Playback info received", {
      id,
      type: res?.type,
      live: meta?.live,
      sourceCount: meta?.source?.length ?? 0,
      sourceTypes: meta?.source?.map((s) => s.hrn ?? s.type) ?? [],
    });

    const src = getSrc(res) as Src[];
    // Playback URLs can carry bearer tokens; never log the sources.

    // Livepeer may return sources for an idle stream (meta.live === 0). If we
    // hand those to the player, the CDN rejects the session and the UI spins
    // forever. Treat an idle live stream as having no sources yet so the
    // polling fallback/offline card can take over.
    if (res?.type === "live" && meta?.live === 0) {
      logger.warn(
        "[getDetailPlaybackSource] Stream is idle (meta.live=0) for ID:",
        id,
      );
      return null;
    }

    if (!src?.length) {
      logger.warn(
        "[getDetailPlaybackSource] No playable sources yet for ID (stream may still be warming up):",
        id,
        { live: meta?.live, sourceCount: meta?.source?.length ?? 0 },
      );
      return null;
    }
    return src;
  } catch (error) {
    if (error instanceof PlaybackAuthorizationError) throw error;
    const isAbortError =
      error instanceof DOMException && error.name === 'AbortError' ||
      (error instanceof Error && (
        error.name === 'AbortError' ||
        error.message?.includes('aborted') ||
        error.message?.includes('signal is aborted') ||
        error.message?.includes('Component unmounted')
      )) ||
      (typeof error === 'string' && (
        error.includes('aborted') ||
        error.includes('Component unmounted')
      ));

    if (isAbortError) {
      throw error;
    }

    logger.error(
      "[getDetailPlaybackSource] Error fetching playback source for ID:",
      id,
      error
    );
    return null;
  }
};
