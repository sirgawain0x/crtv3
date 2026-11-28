/** Public default Foghorn playback host (FrameWorks docs). */
export const FRAMEWORKS_DEFAULT_PLAY_HOST = "https://foghorn.frameworks.network";

export function frameworksPlayHlsUrl(playbackId: string): string {
  const base = FRAMEWORKS_DEFAULT_PLAY_HOST.replace(/\/$/, "");
  return `${base}/play/${encodeURIComponent(playbackId)}/hls/index.m3u8`;
}
