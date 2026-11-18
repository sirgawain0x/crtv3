import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveVideoProviderId: vi.fn(() => "livepeer" as "livepeer" | "frameworks"),
  checkBotIdDeep: vi.fn(async () => ({ isBot: false })),
  rateLimit: vi.fn(async () => null),
  fetch: vi.fn(),
}));

vi.mock("@/lib/video-provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/video-provider")>();
  return {
    ...actual,
    resolveVideoProviderId: mocks.resolveVideoProviderId,
  };
});

vi.mock("@/lib/middleware/botIdGuard", () => ({
  checkBotIdDeep: mocks.checkBotIdDeep,
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { standard: mocks.rateLimit },
}));

import { POST } from "./route";

describe("POST /api/livepeer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveVideoProviderId.mockReturnValue("livepeer");
    vi.stubGlobal("fetch", mocks.fetch);
    process.env.LIVEPEER_FULL_API_KEY = "studio-key";
    process.env.LIVEPEER_FULL_API_URL = "https://livepeer.studio";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete process.env.LIVEPEER_FULL_API_KEY;
    delete process.env.LIVEPEER_FULL_API_URL;
  });

  it("returns 409 in frameworks mode without proxying to Studio", async () => {
    mocks.resolveVideoProviderId.mockReturnValue("frameworks");

    const response = await POST(
      new NextRequest("http://localhost/api/livepeer", {
        method: "POST",
        body: JSON.stringify({ name: "clip.mp4" }),
      }),
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/request-upload/i);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("proxies to Livepeer Studio request-upload in livepeer mode", async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tusEndpoint: "https://tus.example/upload" }),
    });

    const payload = { name: "clip.mp4", size: 1000 };
    const response = await POST(
      new NextRequest("http://localhost/api/livepeer", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://livepeer.studio/api/asset/request-upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer studio-key",
        }),
        body: JSON.stringify(payload),
      }),
    );
    const body = await response.json();
    expect(body).toEqual({ tusEndpoint: "https://tus.example/upload" });
  });

  it("forwards Studio error status in livepeer mode", async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => "quota exceeded",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/livepeer", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Failed to upload asset");
  });
});