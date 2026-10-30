import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postTwitterStatus } from "./publish-twitter";

const ENV_KEYS = [
  "TWITTER_CONSUMER_KEY",
  "TWITTER_CONSUMER_SECRET",
  "TWITTER_ACCESS_TOKEN",
  "TWITTER_ACCESS_TOKEN_SECRET",
] as const;

describe("postTwitterStatus", () => {
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previousEnv[key] = process.env[key];
    }
    process.env.TWITTER_CONSUMER_KEY = "test-consumer-key";
    process.env.TWITTER_CONSUMER_SECRET = "test-consumer-secret";
    process.env.TWITTER_ACCESS_TOKEN = "test-access-token";
    process.env.TWITTER_ACCESS_TOKEN_SECRET = "test-access-token-secret";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
    vi.restoreAllMocks();
  });

  it("POSTs to X API v2 with OAuth 1.0a and returns tweet id", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(_url).toBe("https://api.x.com/2/tweets");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ text: "Hello Creative TV" }));

      const auth = init?.headers as Record<string, string> | undefined;
      const authorization =
        auth?.Authorization ??
        (init?.headers instanceof Headers ? init.headers.get("Authorization") : undefined);
      expect(authorization).toMatch(/^OAuth /);
      expect(authorization).toContain('oauth_consumer_key="test-consumer-key"');
      expect(authorization).toContain('oauth_nonce="fixed-nonce"');
      expect(authorization).toContain('oauth_timestamp="1700000000"');
      expect(authorization).toContain('oauth_token="test-access-token"');
      expect(authorization).toContain('oauth_signature_method="HMAC-SHA1"');
      expect(authorization).toContain('oauth_version="1.0"');
      expect(authorization).toMatch(/oauth_signature="[^"]+"/);
      expect(authorization).not.toContain("test-consumer-secret");
      expect(authorization).not.toContain("test-access-token-secret");

      return new Response(JSON.stringify({ data: { id: "1999888777666555444", text: "Hello Creative TV" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });

    const id = await postTwitterStatus("Hello Creative TV", {
      fetchImpl: fetchMock,
      oauthNonce: "fixed-nonce",
      oauthTimestamp: "1700000000",
    });

    expect(id).toBe("1999888777666555444");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws with HTTP status and X error title on failure", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          title: "Not Found Error",
          detail: "Sorry, that page does not exist",
          status: 404,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      postTwitterStatus("fail tweet", {
        fetchImpl: fetchMock,
        oauthNonce: "n",
        oauthTimestamp: "1",
      }),
    ).rejects.toThrow("Twitter post failed (404): Not Found Error: Sorry, that page does not exist");
  });
});
