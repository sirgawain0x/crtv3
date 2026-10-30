import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePlatformAdminMock } = vi.hoisted(() => ({
  requirePlatformAdminMock: vi.fn(),
}));

vi.mock("@/lib/middleware/botIdGuard", () => ({
  checkBotIdDeep: vi.fn(async () => ({ isBot: false })),
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { standard: vi.fn(async () => null) },
}));

vi.mock("@/lib/access/require-platform-admin", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
  PlatformAdminAuthError: class PlatformAdminAuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/sdk/supabase/service", () => ({
  supabaseService: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(async () => ({ data: [{ owner_address: "0xabc" }], error: null })),
      })),
    })),
  },
}));

import { PATCH } from "@/app/api/creator-profiles/admin/xmerch/route";

describe("PATCH /api/creator-profiles/admin/xmerch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    const { PlatformAdminAuthError } = await import(
      "@/lib/access/require-platform-admin"
    );
    requirePlatformAdminMock.mockRejectedValue(
      new PlatformAdminAuthError(403, "Platform admin wallet required"),
    );

    const req = new NextRequest("http://localhost/api/creator-profiles/admin/xmerch", {
      method: "PATCH",
      body: JSON.stringify({
        owner_address: "0xAbCdEf0123456789012345678901234567890AbCd",
        social_xmerch: { enabled: true, storeUrl: "https://creative.xmerch.app" },
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admin/i);
  });

  it("accepts admin payload and normalizes xMerch data", async () => {
    requirePlatformAdminMock.mockResolvedValue({
      address: "0x2953B96F9160955f6256c9D444F8F7950E6647Df",
    });

    const req = new NextRequest("http://localhost/api/creator-profiles/admin/xmerch", {
      method: "PATCH",
      body: JSON.stringify({
        owner_address: "0xAbCdEf0123456789012345678901234567890AbCd",
        social_xmerch: {
          enabled: true,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
        },
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
