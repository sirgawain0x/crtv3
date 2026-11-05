import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const OWNER = "0xcccccccccccccccccccccccccccccccccccccccc";

const mockRequireWalletAuthFor = vi.fn();
const mockUpsert = vi.fn();

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(async () => ({ isBot: false })),
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: {
    standard: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/auth/require-wallet", () => ({
  requireWalletAuthFor: (...args: unknown[]) => mockRequireWalletAuthFor(...args),
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

vi.mock("@/lib/sdk/supabase/service", () => ({
  supabaseService: {
    from: () => ({
      upsert: mockUpsert,
    }),
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn() },
}));

import { POST } from "./route";

const ENV = process.env;

function upsertRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/creator-profiles/upsert", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("upsert POST — Creator Stock Picks server gate", () => {
  beforeEach(() => {
    mockRequireWalletAuthFor.mockResolvedValue({ address: OWNER });
    mockUpsert.mockResolvedValue({
      data: [{ owner_address: OWNER }],
      error: null,
    });
  });

  afterEach(() => {
    process.env = { ...ENV };
    vi.clearAllMocks();
  });

  it("returns 403 with blocker when flag off (default)", async () => {
    delete process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED;
    const res = await POST(
      upsertRequest({
        owner_address: OWNER,
        stock_pick_ticker: "AMC",
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.blocker).toBe("feature_flag_off");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 403 on production when flag on", async () => {
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED = "true";
    process.env.VERCEL_ENV = "production";
    const res = await POST(
      upsertRequest({
        owner_address: OWNER,
        stock_pick_ticker: "AMC",
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.blocker).toBe("production_deployment");
  });

  it("returns 403 when preview flag on but Sepolia catalog empty", async () => {
    process.env.NEXT_PUBLIC_CREATOR_STOCK_PICKS_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    const res = await POST(
      upsertRequest({
        owner_address: OWNER,
        stock_pick_ticker: "AMC",
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.blocker).toBe("no_verified_sepolia_catalog");
  });
});
