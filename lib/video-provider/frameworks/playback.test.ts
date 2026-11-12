import { createPrivateKey, generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frameworksPlayHlsUrl } from "./constants";
import { resetVideoProviderForTests, getVideoProvider } from "../index";
import { pickHlsUrl, signFrameworksPlaybackToken } from "./playback";

describe("frameworks playback (#405)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("VIDEO_PROVIDER", "frameworks");
    vi.stubEnv("FRAMEWORKS_API_TOKEN", "fw-token");
    vi.stubEnv("FRAMEWORKS_GRAPHQL_URL", "https://bridge.example/graphql");
    resetVideoProviderForTests();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    fetchMock.mockReset();
  });

  it("playback.get returns Foghorn /play HLS (viewer geo routing)", async () => {
    const result = await getVideoProvider().playback.get("pb-1");
    const sources = result.playbackInfo?.meta?.source ?? [];
    expect(sources[0]?.type).toBe("application/x-mpegURL");
    expect(sources[0]?.url).toBe(frameworksPlayHlsUrl("pb-1"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("playback.get attaches signed viewer JWT as jwt query param on /play URL", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem);
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");

    const result = await getVideoProvider().playback.get("pb-jwt");
    const url = result.playbackInfo?.meta?.source?.[0]?.url ?? "";
    expect(url).toMatch(
      /^https:\/\/foghorn\.frameworks\.network\/play\/pb-jwt\/hls\/index\.m3u8\?jwt=/,
    );
    const jwtParam = new URL(url).searchParams.get("jwt");
    expect(jwtParam).toBeTruthy();
    const header = JSON.parse(
      Buffer.from(String(jwtParam).split(".")[0] ?? "", "base64url").toString("utf8"),
    ) as { kid?: string; alg?: string };
    expect(header.kid).toBe("kid-test");
    expect(header.alg).toBe("ES256");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["WHEP", "https://edge.example/whep"],
    ["WebRTC", "https://edge.example/webrtc"],
    ["DASH", "https://edge.example/manifest.mpd"],
  ])("pickHlsUrl ignores %s primary and falls back to Foghorn HLS", (_label, url) => {
    const resolved = pickHlsUrl({
      resolveViewerEndpoint: {
        primary: { url, protocol: _label.toUpperCase() },
      },
    });
    expect(resolved).toBeUndefined();
    expect(resolved ?? frameworksPlayHlsUrl("pb-whep")).toBe(
      frameworksPlayHlsUrl("pb-whep"),
    );
  });

  it("pickHlsUrl ignores non-m3u8 primary.url without HLS protocol", () => {
    const resolved = pickHlsUrl({
      resolveViewerEndpoint: {
        primary: {
          url: "https://cdn.example/live/stream",
          protocol: "HTTP",
        },
      },
    });
    expect(resolved).toBeUndefined();
    expect(resolved ?? frameworksPlayHlsUrl("pb-2")).toBe(frameworksPlayHlsUrl("pb-2"));
  });

  it("pickHlsUrl accepts outputs.HLS and m3u8 primary", () => {
    expect(
      pickHlsUrl({
        resolveViewerEndpoint: {
          primary: {
            outputs: {
              HLS: { url: "https://edge.example/hls/index.m3u8" },
            },
          },
        },
      }),
    ).toBe("https://edge.example/hls/index.m3u8");

    expect(
      pickHlsUrl({
        resolveViewerEndpoint: {
          primary: {
            url: "https://edge.example/alt/playlist.m3u8",
            protocol: "HLS",
          },
        },
      }),
    ).toBe("https://edge.example/alt/playlist.m3u8");
  });

  it("signFrameworksPlaybackToken mints ES256 JWT with configured kid", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem);
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");

    const token = signFrameworksPlaybackToken({
      subject: "viewer-1",
      audience: "viewer",
      expiresInSeconds: 60,
    });
    expect(token).toBeTruthy();
    const decoded = JSON.parse(
      Buffer.from(String(token).split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { sub?: string; aud?: string };
    expect(decoded.sub).toBe("viewer-1");
    expect(decoded.aud).toBe("viewer");

    const header = JSON.parse(
      Buffer.from(String(token).split(".")[0] ?? "", "base64url").toString("utf8"),
    ) as { kid?: string; alg?: string };
    expect(header.kid).toBe("kid-test");
    expect(header.alg).toBe("ES256");

    createPrivateKey(pem);
  });

  it("returns null token when signing env is missing", () => {
    delete process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY;
    delete process.env.FRAMEWORKS_SIGNING_KID;
    expect(signFrameworksPlaybackToken()).toBeNull();
  });
});
