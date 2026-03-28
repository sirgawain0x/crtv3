import { fullLivepeer } from "@/lib/sdk/livepeer/fullClient";
import { getSrc } from "@livepeer/react/external";
import { Src } from "@livepeer/react";
import { logger } from '@/lib/utils/logger';


export const getDetailPlaybackSource = async (
  id: string,
  opts?: { signal?: AbortSignal }
): Promise<Src[] | null> => {
  try {
    logger.debug("[getDetailPlaybackSource] Fetching for ID:", id);

    // Use direct fetch with signal support instead of SDK
    // Proxy through our internal API to avoid CORS issues
    const response = await fetch(`/api/livepeer/playback-info?playbackId=${id}`, {
      signal: opts?.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
    // Check if this is an abort-related error and re-throw it silently
    const isAbortError =
      error instanceof DOMException && error.name === 'AbortError' ||
      (error instanceof Error && (
        error.name === 'AbortError' ||
        error.message?.includes('aborted') ||
        error.message?.includes('signal is aborted') ||
        error.message?.includes('Component unmounted')
      )) ||
      // Check if error is just a string containing abort-related text
      (typeof error === 'string' && (
        error.includes('aborted') ||
        error.includes('Component unmounted')
      ));

    if (isAbortError) {
      // Silently re-throw abort errors - they're expected during cleanup
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
