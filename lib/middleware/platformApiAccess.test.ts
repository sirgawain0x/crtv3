import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyX402PaymentFromRequest = vi.fn();
const mockCheckBotId = vi.fn();
vi.mock("botid/server", () => ({ checkBotId: (...args: unknown[]) => mockCheckBotId(...args) }));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: {
    apiKey: vi.fn(async () => null),
    generous: vi.fn(async () => null),
    playbackInfo: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/middleware/x402Gate", () => ({
  PLATFORM_API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
  },
  buildX402PaymentRequiredResponse: vi.fn(() =>
    Response.json({ error: "Payment Required", accepts: [{ payTo: "0xrecipient" }] }, { status: 402 }),
  ),
  getX402PriceForResource: vi.fn(() => "10000"),
  getX402Recipient: vi.fn(() => "0xrecipient"),
  verifyX402PaymentFromRequest: (...args: unknown[]) =>
    mockVerifyX402PaymentFromRequest(...args),
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";

describe("requirePlatformApiAccess", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PLATFORM_API_ACCESS_ENABLED = "true";
    process.env.CREATIVE_PLATFORM_INTERNAL_API_KEYS = "creative-guide:internal_secret";
    mockCheckBotId.mockResolvedValue({ isHuman: true, isBot: false, isVerifiedBot: false, bypassed: false });
    process.env.CREATIVE_PLATFORM_ADMIN_API_KEYS = "crtv_admin_test";
    process.env.CREATIVE_PLATFORM_PARTNER_API_KEYS = "mixtape:crtv_pk_mixtape_test";
    process.env.X402_API_RECIPIENT = "0x31ee83aef931a1af321c505053040e98545a5614";
    process.env.X402_PLAYBACK_RESOLVE_PRICE = "10000";
    mockVerifyX402PaymentFromRequest.mockResolvedValue({
      ok: false,
      error: "Missing payment proof",
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("allows admin API key", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer crtv_admin_test" },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.tier).toBe("admin");
    }
  });

  it("requires payment even with an external partner API key", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer crtv_pk_mixtape_test" },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(402);
  });

  it("returns 401 for invalid API key", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer invalid" },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 402 when no auth and no payment", async () => {
    const request = new NextRequest("http://localhost/api/test");
    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(402);
    }
  });

  it("allows x402 payment proof", async () => {
    mockVerifyX402PaymentFromRequest.mockResolvedValueOnce({ ok: true });
    const request = new NextRequest("http://localhost/api/test", {
      headers: { "X-Payment-Proof": "proof" },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.tier).toBe("x402");
    }
  });

  it("bypasses gating when access is disabled", async () => {
    process.env.PLATFORM_API_ACCESS_ENABLED = "false";
    delete process.env.CREATIVE_PLATFORM_INTERNAL_API_KEYS;
    delete process.env.CREATIVE_PLATFORM_ADMIN_API_KEYS;
    delete process.env.CREATIVE_PLATFORM_PARTNER_API_KEYS;
    delete process.env.X402_API_RECIPIENT;

    const request = new NextRequest("http://localhost/api/test");
    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.tier).toBe("public");
    }
  });

  it("allows same-origin requests without auth when gating is enabled", async () => {
    const request = new NextRequest("http://localhost/api/livepeer/playback-info", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.info" });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.tier).toBe("public");
    }
  });

  it("requires payment for same-site requests without credentials", async () => {
    const request = new NextRequest("http://localhost/api/livepeer/playback-info", {
      headers: { "Sec-Fetch-Site": "same-site" },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.info" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(402);
  });

  it("returns 402 for cross-site requests without auth", async () => {
    const request = new NextRequest("http://localhost/api/livepeer/playback-info", {
      headers: {
        "Sec-Fetch-Site": "cross-site",
        Origin: "https://evil.example.com",
      },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.info" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(402);
    }
  });

  it("requires partner payment on cross-origin requests", async () => {
    const request = new NextRequest("https://tv.creativeplatform.xyz/api/video-assets/by-asset-id/uuid/playback", {
      headers: {
        Authorization: "Bearer crtv_pk_mixtape_test",
        Origin: "https://air.creativeplatform.xyz",
        "Sec-Fetch-Site": "cross-site",
      },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.resolve" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(402);
  });

  it("does not let a partner key bypass payment with browser headers", async () => {
    const request = new NextRequest("http://localhost/api/livepeer/playback-info", {
      headers: {
        Authorization: "Bearer crtv_pk_mixtape_test",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    const result = await requirePlatformApiAccess(request, { resource: "playback.info" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(402);
  });
});


describe("production cost boundaries", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("does not fail open in production when the enable flag is false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLATFORM_API_ACCESS_ENABLED", "false");
    const result = await requirePlatformApiAccess(new NextRequest("https://tv.creativeplatform.xyz/api/test"), { resource: "rpc.story" });
    expect(result.allowed).toBe(false);
  });
  it("allows only authenticated internal bots without payment", async () => {
    vi.stubEnv("PLATFORM_API_ACCESS_ENABLED", "true");
    vi.stubEnv("CREATIVE_PLATFORM_INTERNAL_API_KEYS", "creative-guide:internal_secret");
    const result = await requirePlatformApiAccess(new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer internal_secret" },
    }), { resource: "rpc.story" });
    expect(result).toEqual({ allowed: true, tier: "internal", keyId: "creative-guide" });
  });
  it.each([false, true])("does not trust spoofed same-origin headers from a bot (verified=%s)", async (verified) => {
    vi.stubEnv("PLATFORM_API_ACCESS_ENABLED", "true");
    mockCheckBotId.mockResolvedValue({ isHuman: false, isBot: true, isVerifiedBot: verified });
    mockVerifyX402PaymentFromRequest.mockResolvedValue({ ok: false, error: "Missing payment proof" });
    const result = await requirePlatformApiAccess(new NextRequest("http://localhost/api/test", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    }), { resource: "rpc.story" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(402);
  });
  it("fails closed on BotID errors before payment verification or upstream work", async () => {
    vi.stubEnv("PLATFORM_API_ACCESS_ENABLED", "true");
    mockCheckBotId.mockRejectedValue(new Error("unavailable"));
    const result = await requirePlatformApiAccess(new NextRequest("http://localhost/api/test", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    }), { resource: "rpc.story" });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(503);
    expect(mockVerifyX402PaymentFromRequest).not.toHaveBeenCalled();
  });
  it("preserves verified first-party browser access with a separate user-session bearer token", async () => {
    vi.stubEnv("PLATFORM_API_ACCESS_ENABLED", "true");
    mockCheckBotId.mockResolvedValue({ isHuman: true, isBot: false, bypassed: false });
    const result = await requirePlatformApiAccess(new NextRequest("http://localhost/api/earn/position", {
      headers: { "Sec-Fetch-Site": "same-origin", Authorization: "Bearer privy-user-token" },
    }), { resource: "earn.position" });
    expect(result).toEqual({ allowed: true, tier: "public" });
  });
  it("does not accept a production firewall bypass as proof of humanity", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockCheckBotId.mockResolvedValue({ isHuman: true, isBot: false, bypassed: true });
    mockVerifyX402PaymentFromRequest.mockResolvedValue({ ok: false, error: "Missing payment proof" });
    const result = await requirePlatformApiAccess(new NextRequest("http://localhost/api/test", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    }), { resource: "rpc.story" });
    expect(result.allowed).toBe(false);
  });

});
