import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePlatformAdminMock, maybeSingleMock, updateSelectMock, supabaseServiceRef } =
  vi.hoisted(() => ({
    requirePlatformAdminMock: vi.fn(),
    maybeSingleMock: vi.fn(),
    updateSelectMock: vi.fn(),
    supabaseServiceRef: {
      value: {
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
      } as unknown,
    },
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
  get supabaseService() {
    return supabaseServiceRef.value;
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

const validBody = {
  owner_address: OWNER,
  social_xmerch: {
    enabled: true,
    storeUrl: "https://creative.xmerch.app",
    featuredProductUrls: ["https://creative.xmerch.app/products/tee"],
  },
};

describe("PATCH /api/creator-profiles/admin/xmerch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseServiceRef.value = {
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
    };
    maybeSingleMock.mockResolvedValue({
      data: { owner_address: OWNER.toLowerCase() },
      error: null,
    });
    updateSelectMock.mockResolvedValue({
      data: [{ owner_address: OWNER.toLowerCase() }],
      error: null,
    });
    requirePlatformAdminMock.mockResolvedValue({
      address: PLATFORM_ADMIN_ADDRESS,
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

  it("returns 503 when supabaseService is unavailable", async () => {
    supabaseServiceRef.value = null;

    const res = await PATCH(patchRequest(validBody));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/server database access/i);
  });

  it("returns 404 when creator profile does not exist", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const res = await PATCH(patchRequest(validBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/not found/i);
    expect(updateSelectMock).not.toHaveBeenCalled();
  });

  it("returns 500 when update matches zero rows", async () => {
    updateSelectMock.mockResolvedValue({ data: [], error: null });

    const res = await PATCH(patchRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/no rows updated/i);
  });

  it("accepts admin payload and normalizes xMerch data", async () => {
    const res = await PATCH(patchRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateSelectMock).toHaveBeenCalled();
  });
});
