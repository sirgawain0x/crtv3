/** Classify provider playlists without returning their URLs, contents or raw errors. */
export function inspectHlsManifest(body: string) {
  const manifest = body.trimStart().startsWith('#EXTM3U');
  const failed = /^#EXT-X-ERROR:/m.test(body);
  let errorCode: string | undefined;
  if (failed) {
    errorCode = /No HLS compatible tracks found/i.test(body) ? 'NO_HLS_TRACKS'
      : /not allowed|rejected|denied/i.test(body) ? 'EDGE_ACCESS_DENIED'
      : /Stream open failed|Could not connect to stream|Stream initialization failed/i.test(body) ? 'STREAM_OPEN_FAILED'
      : /not active|not available/i.test(body) ? 'STREAM_UNAVAILABLE'
      : /past end|range.*past/i.test(body) ? 'PLAYBACK_RANGE_UNAVAILABLE'
      : 'PROVIDER_PLAYLIST_ERROR';
  }
  return { manifest, playable: manifest && !failed && /^#(?:EXTINF:|EXT-X-STREAM-INF:)/m.test(body), errorCode };
}
