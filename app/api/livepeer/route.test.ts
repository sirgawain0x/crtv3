import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveVideoProviderId: vi.fn(() => "livepeer" as "livepeer" | "frameworks"),
  checkBotIdDeep: vi.fn(async () => ({ isBot: false })),
  rateLimit: vi.fn(async () => null),
  fetch: vi.fn(),
  requireWalletAuth: vi.fn(),
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

vi.mock("@/lib/auth/require-wallet", () => ({
  requireWalletAuth: (...args: unknown[]) => mocks.requireWalletAuth(...args),
  WalletAuthError: class WalletAuthError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WalletAuthError";
    }
  },
}));

import { POST } from "./route";

const CREATOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function postUpload(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/livepeer", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/livepeer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveVideoProviderId.mockReturnValue("livepeer");
    vi.stubGlobal("fetch", mocks.fetch);
    process.env.LIVEPEER_FULL_API_KEY = "studio-key";
    process.env.LIVEPEER_FULL_API_URL = "https://livepeer.studio";
    mocks.requireWalletAuth.mockResolvedValue({ address: CREATOR });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete process.env.LIVEPEER_FULL_API_KEY;
    delete process.env.LIVEPEER_FULL_API_URL;
  });

  it("returns 409 in frameworks mode without proxying to Studio", async () => {
    mocks.resolveVideoProviderId.mockReturnValue("frameworks");

    const response = await POST(postUpload({ name: "clip.mp4" }));

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/request-upload/i);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.requireWalletAuth).not.toHaveBeenCalled();
  });

  it("returns 401 when wallet proof is missing", async () => {
    mocks.requireWalletAuth.mockRejectedValueOnce(
      new (await import("@/lib/auth/require-wallet")).WalletAuthError(
        401,
        "Missing wallet auth headers",
      ),
    );

    const response = await POST(postUpload({ name: "clip.mp4", size: 1000 }));

    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("returns 401 when wallet proof is invalid", async () => {
    mocks.requireWalletAuth.mockRejectedValueOnce(
      new (await import("@/lib/auth/require-wallet")).WalletAuthError(
        401,
        "Invalid wallet signature",
      ),
    );

    const response = await POST(
      postUpload(
        { name: "clip.mp4", size: 1000 },
        {
          "X-Wallet-Address": CREATOR,
          "X-Wallet-Timestamp": "1700000000",
          "X-Wallet-Signature": "0xbad",
        },
      ),
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toMatch(/Invalid wallet signature/i);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("proxies authenticated Studio request-upload with server-built body", async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tusEndpoint: "https://tus.example/upload" }),
    });

    const response = await POST(
      postUpload({
        name: "clip.mp4",
        size: 1000,
        creatorId: { type: "unverified", value: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
        evilField: "drop-me",
        storage: { ipfs: false },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.requireWalletAuth).toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://livepeer.studio/api/asset/request-upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer studio-key",
        }),
      }),
    );
    const [, init] = mocks.fetch.mock.calls[0] ?? [];
    const studioBody = JSON.parse(String((init as RequestInit).body));
    expect(studioBody).toEqual({
      name: "clip.mp4",
      size: 1000,
      storage: { ipfs: true },
      creatorId: { type: "unverified", value: CREATOR },
      staticMp4: true,
    });
    expect(studioBody).not.toHaveProperty("evilField");
    const body = await response.json();
    expect(body).toEqual({ tusEndpoint: "https://tus.example/upload" });
  });

  it("forwards Studio error status in livepeer mode", async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => "quota exceeded",
    });

    const response = await POST(postUpload({ name: "clip.mp4", size: 1 }));

    expect(response.status).toBe(422);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Failed to upload asset");
  });
});