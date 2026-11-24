/** Owner-only destinations; URLs can contain the publisher's stream key. */
export type StreamIngestDestination = {
  provider: "livepeer" | "frameworks";
  whipUrl?: string;
  rtmpUrl?: string;
};
