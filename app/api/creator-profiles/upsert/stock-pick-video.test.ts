import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const OWNER = "0xcccccccccccccccccccccccccccccccccccccccc";
const OTHER = "0xdddddddddddddddddddddddddddddddddddddddd";
const ASSET_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

const mockRequireWalletAuthFor = vi.fn();
const mockValidate = vi.fn();
const mockMaybeSingle = vi.fn();
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

vi.mock("@/lib/creator-stock-picks/runtime-policy", () => ({
  isCreatorStockPicksRuntimeEnabled: () => true,
  getCreatorStockPicksBlocker: () => null,
}));

vi.mock("@/lib/creator-stock-picks/validate-stock-pick", () => ({
  validateCreatorStockPickPayload: (...args: unknown[]) => mockValidate(...args),
}));

vi.mock("@/lib/creator-stock-picks/validate-social-payload", () => ({
  validateAndNormalizeSocialPayload: () => ({ ok: true, payload: {} }),
}));

vi.mock("@/lib/sdk/supabase/service", () => ({
  supabaseService: {
    from: (table: string) => {
      if (table === "video_assets") {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        };
      }
      return {
        upsert: () => ({
          select: mockUpsert,
        }),
      };
    },
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn() },
}));

import { POST } from "./route";

function upsertRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/creator-profiles/upsert", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("upsert POST — stock pick video asset_id lookup", () => {
  beforeEach(() => {
    mockRequireWalletAuthFor.mockResolvedValue({ address: OWNER });
    mockValidate.mockReturnValue({
      ok: true,
      value: {
        ticker: "TST",
        token_address: "0xabc",
        partner_url: "https://o1.exchange/swap?chainId=84532",
        note: null,
        video_asset_id: ASSET_ID,
        chain_id: 84532,
      },
    });
    mockUpsert.mockResolvedValue({
      data: [{ owner_address: OWNER }],
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("accepts owner Livepeer asset_id (queries video_assets.asset_id)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        asset_id: ASSET_ID,
        creator_id: OWNER,
        playback_id: "pb-1",
      },
      error: null,
    });

    const res = await POST(
      upsertRequest({
        owner_address: OWNER,
        stock_pick_video_asset_id: ASSET_ID,
      }),
    );
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("rejects another creator's asset", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        asset_id: ASSET_ID,
        creator_id: OTHER,
        playback_id: "pb-1",
      },
      error: null,
    });

    const res = await POST(
      upsertRequest({
        owner_address: OWNER,
        stock_pick_video_asset_id: ASSET_ID,
      }),
    );
    expect(res.status).toBe(403);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects missing asset", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(
      upsertRequest({
        owner_address: OWNER,
        stock_pick_video_asset_id: ASSET_ID,
      }),
    );
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
