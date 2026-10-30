import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePlatformAdminMock, maybeSingleMock, updateSelectMock } = vi.hoisted(() => ({
  requirePlatformAdminMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  updateSelectMock: vi.fn(),
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
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: updateSelectMock,
        })),
      })),
    })),
  },
}));

import { PATCH } from "@/app/api/creator-profiles/admin/xmerch/route";
import { PLATFORM_ADMIN_ADDRESS } from "@/lib/access/platform-admin";

const OWNER = "0xAbCdEf0123456789012345678901234567890AbCd";

function patchRequest(body: object) {
  return new NextRequest("http://localhost/api/creator-profiles/admin/xmerch", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/creator-profiles/admin/xmerch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleMock.mockResolvedValue({
      data: { owner_address: OWNER.toLowerCase() },
      error: null,
    });
    updateSelectMock.mockResolvedValue({
      data: [{ owner_address: OWNER.toLowerCase() }],
      error: null,
    });
  });

  it("rejects non-admin callers", async () => {
    const { PlatformAdminAuthError } = await import(
      "@/lib/access/require-platform-admin"
    );
    requirePlatformAdminMock.mockRejectedValue(
      new PlatformAdminAuthError(403, "Platform admin wallet required"),
    );

    const res = await PATCH(
      patchRequest({
        owner_address: OWNER,
        social_xmerch: { enabled: true, storeUrl: "https://creative.xmerch.app" },
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admin/i);
  });

  it("returns 404 when creator profile does not exist", async () => {
    requirePlatformAdminMock.mockResolvedValue({
      address: PLATFORM_ADMIN_ADDRESS,
    });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const res = await PATCH(
      patchRequest({
        owner_address: OWNER,
        social_xmerch: { enabled: true, storeUrl: "https://creative.xmerch.app" },
      }),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/not found/i);
    expect(updateSelectMock).not.toHaveBeenCalled();
  });

  it("accepts admin payload and normalizes xMerch data", async () => {
    requirePlatformAdminMock.mockResolvedValue({
      address: PLATFORM_ADMIN_ADDRESS,
    });

    const res = await PATCH(
      patchRequest({
        owner_address: OWNER,
        social_xmerch: {
          enabled: true,
          storeUrl: "https://creative.xmerch.app",
          featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateSelectMock).toHaveBeenCalled();
  });
});
