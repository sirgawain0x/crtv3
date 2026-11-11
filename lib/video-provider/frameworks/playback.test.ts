import { createPrivateKey, generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetVideoProviderForTests, getVideoProvider } from "../index";
import { signFrameworksPlaybackToken } from "./playback";

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

  it("playback.get maps resolveViewerEndpoint to playback meta source", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          resolveViewerEndpoint: {
            primary: {
              url: "https://edge.example/hls/index.m3u8",
              outputs: {
                HLS: {
                  url: "https://edge.example/hls/index.m3u8",
                },
              },
            },
            metadata: { contentId: "pb-1", isLive: true },
          },
        },
      }),
    });

    const result = await getVideoProvider().playback.get("pb-1");
    const sources = result.playbackInfo?.meta?.source ?? [];
    expect(sources[0]?.url).toBe("https://edge.example/hls/index.m3u8");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      query: string;
    };
    expect(body.query).toContain("resolveViewerEndpoint");
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
