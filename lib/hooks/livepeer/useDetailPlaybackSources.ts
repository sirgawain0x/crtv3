import { getSrc } from "@livepeer/react/external";
import { Src } from "@livepeer/react";
import { logger } from '@/lib/utils/logger';

const MAX_429_RETRIES = 3;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPlaybackInfo(
  id: string,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const response = await fetch(`/api/livepeer/playback-info?playbackId=${id}`, {
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
  opts?: { signal?: AbortSignal }
): Promise<Src[] | null> => {
  try {
    logger.debug("[getDetailPlaybackSource] Fetching for ID:", id);

    const response = await fetchPlaybackInfo(id, opts?.signal);

    if (!response.ok) {
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
    logger.debug("[getDetailPlaybackSource] Playback info:", res);

    const src = getSrc(res) as Src[];
    logger.debug("[getDetailPlaybackSource] Generated sources:", src);
    if (!src?.length) {
      logger.error(
        "[getDetailPlaybackSource] No valid sources generated for ID:",
        id
      );
      return null;
    }
    return src;
  } catch (error) {
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
