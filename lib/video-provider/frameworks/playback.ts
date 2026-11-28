import "server-only";
import type { PlaybackInfoResult } from "../types";
import { frameworksPlayHlsUrl } from "./constants";

// Signing and URL construction live in ./playback-signing so a plain Node
// process (an operator CLI) can use them; `server-only` throws outside the
// Next.js react-server condition. This module keeps the marker for the app
// graph and re-exports the same API surface.
export {
  buildAuthorizedViewerPlayHlsUrl,
  signAuthorizedFrameworksPlaybackToken,
  signFrameworksPlaybackToken,
  type AuthorizedFrameworksPlaybackTokenInput,
  type FrameworksPlaybackTokenOptions,
} from "./playback-signing";

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

function unsignedViewerPlayHlsUrl(playbackId: string): string {
  return frameworksPlayHlsUrl(playbackId);
}

export const frameworksPlayback = {
  get: async (playbackId: string): Promise<PlaybackInfoResult> => {
    const url = unsignedViewerPlayHlsUrl(playbackId);
    return toPlaybackInfo(playbackId, url);
  },
};
