export type AirPlayAvailability = "available" | "not-available" | "unknown";

export interface AirPlayCapableVideo extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitPlaybackTargetAvailability?: string;
}

export function isAirPlaySupported(): boolean {
  if (typeof document === "undefined") return false;
  const video = document.createElement("video") as AirPlayCapableVideo;
  return typeof video.webkitShowPlaybackTargetPicker === "function";
}

export function getAirPlayAvailability(
  video: AirPlayCapableVideo | null,
): AirPlayAvailability {
  if (!video || !isAirPlaySupported()) return "not-available";
  const value = video.webkitPlaybackTargetAvailability;
  if (value === "available") return "available";
  if (value === "not-available") return "not-available";
  return "unknown";
}

export function showAirPlayPicker(video: AirPlayCapableVideo | null): boolean {
  if (!video?.webkitShowPlaybackTargetPicker) return false;
  video.webkitShowPlaybackTargetPicker();
  return true;
}
