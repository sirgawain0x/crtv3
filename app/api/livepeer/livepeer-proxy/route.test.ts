import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireHumanOrVerifiedBot = vi.fn();
const mockRateLimit = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/middleware/botIdGuard", () => ({
  requireHumanOrVerifiedBot: (...args: unknown[]) =>
    mockRequireHumanOrVerifiedBot(...args),
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: {
    standard: (...args: unknown[]) => mockRateLimit(...args),
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST } from "@/app/api/livepeer/livepeer-proxy/route";

describe("POST /api/livepeer/livepeer-proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireHumanOrVerifiedBot.mockResolvedValue({ allowed: true });
    mockRateLimit.mockResolvedValue(null);
    process.env.LIVEPEER_FULL_API_KEY = "test-full-key";
    global.fetch = mockFetch as typeof fetch;
  });

  it("returns MISSING_API_KEY when full key is absent", async () => {
    delete process.env.LIVEPEER_FULL_API_KEY;

    const req = new NextRequest("http://localhost/api/livepeer/livepeer-proxy", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("MISSING_API_KEY");
  });

  it("returns LIVEPEER_ERROR when upstream fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ error: "quota exceeded" }),
    });

    const req = new NextRequest("http://localhost/api/livepeer/livepeer-proxy", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("LIVEPEER_ERROR");
    expect(body.error).toBe("quota exceeded");
  });

  it("returns stream payload on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: "stream-id",
        streamKey: "sk_test",
        playbackId: "playback-id",
      }),
    });

    const req = new NextRequest("http://localhost/api/livepeer/livepeer-proxy", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.streamKey).toBe("sk_test");
  });
});
