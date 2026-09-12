import { describe, expect, it } from "vitest";
import type { Src } from "@livepeer/react";
import {
  extractHlsPlaybackUrl,
  isCastableLivepeerHost,
  isHttpsCastableUrl,
} from "./extract-playback-url";

describe("extractHlsPlaybackUrl", () => {
  it("prefers HLS mime type sources", () => {
    const sources: Src[] = [
      { src: "https://cdn.livepeer.studio/video.mp4", type: "video/mp4" },
      {
        src: "https://lp-playback.studio/hls/stream.m3u8",
        type: "application/x-mpegURL",
      },
    ];
    expect(extractHlsPlaybackUrl(sources)).toBe(
      "https://lp-playback.studio/hls/stream.m3u8",
    );
  });

  it("falls back to .m3u8 extension", () => {
    const sources: Src[] = [
      { src: "https://livepeercdn.studio/hls/abc/index.m3u8", type: "video" },
    ];
    expect(extractHlsPlaybackUrl(sources)).toContain(".m3u8");
  });
});

describe("isCastableLivepeerHost", () => {
  it("accepts known Livepeer CDN hosts", () => {
    expect(isCastableLivepeerHost("lp-playback.studio")).toBe(true);
    expect(isCastableLivepeerHost("vod.livepeercdn.studio")).toBe(true);
  });

  it("rejects unknown hosts", () => {
    expect(isCastableLivepeerHost("evil.example.com")).toBe(false);
  });
});

describe("isHttpsCastableUrl", () => {
  it("requires https Livepeer CDN URLs", () => {
    expect(
      isHttpsCastableUrl("https://lp-playback.studio/hls/test.m3u8"),
    ).toBe(true);
    expect(isHttpsCastableUrl("http://lp-playback.studio/hls/test.m3u8")).toBe(
      false,
    );
  });
});
