import { createPrivateKey, generateKeyPairSync } from "crypto";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frameworksPlayHlsUrl } from "./constants";
import { FrameworksPlaybackSigningError } from "../errors";
import { resetVideoProviderForTests, getVideoProvider } from "../index";
import {
  buildAuthorizedViewerPlayHlsUrl,
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
    vi.restoreAllMocks();
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

  it("buildAuthorizedViewerPlayHlsUrl throws when signing env is missing", () => {
    delete process.env.FRAMEWORKS_SIGNING_PRIVATE_KEY;
    delete process.env.FRAMEWORKS_SIGNING_KID;
    expect(() => buildAuthorizedViewerPlayHlsUrl({ playbackId: "pb-missing" })).toThrow(
      FrameworksPlaybackSigningError,
    );
    try {
      buildAuthorizedViewerPlayHlsUrl({ playbackId: "pb-missing" });
    } catch (err) {
      expect(err).toBeInstanceOf(FrameworksPlaybackSigningError);
      expect((err as FrameworksPlaybackSigningError).reason).toBe("signing_unavailable");
    }
  });

  it("buildAuthorizedViewerPlayHlsUrl throws when jwt.sign fails", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    vi.stubEnv("FRAMEWORKS_SIGNING_PRIVATE_KEY", pem);
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-test");
    vi.spyOn(jwt, "sign").mockImplementation(() => {
      throw new Error("sign failed");
    });

    expect(() => buildAuthorizedViewerPlayHlsUrl({ playbackId: "pb-bad-sign" })).toThrow(
      FrameworksPlaybackSigningError,
    );
  });

  it("buildAuthorizedViewerPlayHlsUrl throws for empty playbackId", () => {
    expect(() => buildAuthorizedViewerPlayHlsUrl({ playbackId: "  " })).toThrow(
      FrameworksPlaybackSigningError,
    );
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