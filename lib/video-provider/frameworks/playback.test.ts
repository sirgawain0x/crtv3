import { createPrivateKey, generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frameworksPlayHlsUrl } from "./constants";
import { resetVideoProviderForTests, getVideoProvider } from "../index";
import {
  buildAuthorizedViewerPlayHlsUrl,
  pickHlsUrl,
  signAuthorizedFrameworksPlaybackToken,
  signFrameworksPlaybackToken,
} from "./playback";

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

  it("playback.get returns unsigned Foghorn /play HLS (viewer geo routing)", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem);
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");

    const result = await getVideoProvider().playback.get("pb-1");
    const sources = result.playbackInfo?.meta?.source ?? [];
    expect(sources[0]?.type).toBe("application/x-mpegURL");
    expect(sources[0]?.url).toBe(frameworksPlayHlsUrl("pb-1"));
    expect(new URL(String(sources[0]?.url)).searchParams.has("jwt")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signAuthorizedFrameworksPlaybackToken binds aud to playbackId with exp/iat", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem);
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");

    const nowSec = Math.floor(Date.now() / 1000);
    const token = signAuthorizedFrameworksPlaybackToken({
      playbackId: "pb-scoped",
      subject: "viewer-1",
      expiresInSeconds: 120,
    });
    expect(token).toBeTruthy();
    const decoded = JSON.parse(
      Buffer.from(String(token).split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { sub?: string; aud?: string; iat?: number; exp?: number };
    expect(decoded.sub).toBe("viewer-1");
    expect(decoded.aud).toBe("pb-scoped");
    expect(decoded.iat).toBeGreaterThanOrEqual(nowSec - 5);
    expect(decoded.exp).toBeGreaterThan(decoded.iat ?? 0);
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(120);
  });

  it("buildAuthorizedViewerPlayHlsUrl attaches scoped jwt query param on /play URL", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem);
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");

    const url = buildAuthorizedViewerPlayHlsUrl({ playbackId: "pb-jwt" });
    expect(url).toMatch(
      /^https:\/\/foghorn\.frameworks\.network\/play\/pb-jwt\/hls\/index\.m3u8\?jwt=/,
    );
    const jwtParam = new URL(url).searchParams.get("jwt");
    const decoded = JSON.parse(
      Buffer.from(String(jwtParam).split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { aud?: string };
    expect(decoded.aud).toBe("pb-jwt");
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
    const foghornFallback = frameworksPlayHlsUrl("pb-whep");
    expect(foghornFallback).toContain("/play/pb-whep/hls/index.m3u8");
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
    expect(frameworksPlayHlsUrl("pb-2")).toMatch(/\/play\/pb-2\/hls\/index\.m3u8$/);
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

  it("normalizes escaped PEM newlines before signing", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem.replace(/\n/g, "\\n"));
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");

    expect(signFrameworksPlaybackToken({ audience: "pb-env" })).toBeTruthy();
  });

  it("returns null token when signing env is missing and warns", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY;
    delete process.env.FRAMEWORKS_SIGNING_KID;
    expect(signFrameworksPlaybackToken()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});