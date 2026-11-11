import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const OWNER = "0xcccccccccccccccccccccccccccccccccccccccc";
const OTHER = "0xdddddddddddddddddddddddddddddddddddddddd";
const ASSET_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

const mockRequireWalletAuthFor = vi.fn();
const mockValidate = vi.fn();
const mockUpsert = vi.fn();

type FilterCall = { operator: "eq" | "ilike"; column: string; value: string };

function createVideoAssetsTableMock() {
  const filterCallsByQuery: FilterCall[][] = [];
  let ownedRow: { data: unknown; error: unknown } = { data: null, error: null };
  let anyRow: { data: unknown; error: unknown } = { data: null, error: null };
  let nextQueryIndex = 0;

  const buildSelectChain = (queryIndex: number) => {
    const calls: FilterCall[] = [];
    filterCallsByQuery[queryIndex] = calls;
    const chain = {
      eq: (column: string, value: string) => {
        calls.push({ operator: "eq", column, value });
        return chain;
      },
      ilike: (column: string, value: string) => {
        calls.push({ operator: "ilike", column, value });
        return chain;
      },
      maybeSingle: async () => {
        if (queryIndex !== 0 || !ownedRow.data) {
          return queryIndex === 0 ? ownedRow : anyRow;
        }
        const { creator_id } = ownedRow.data as { creator_id: string };
        const ownerFilter = calls.find(({ column }) => column === "creator_id");
        const matchesOwner = ownerFilter?.operator === "ilike"
          ? creator_id.toLowerCase() === ownerFilter.value.toLowerCase()
          : creator_id === ownerFilter?.value;
        return matchesOwner ? ownedRow : { data: null, error: null };
      },
    };
    return chain;
  };

  return {
    setOwnedRow(row: typeof ownedRow) {
      ownedRow = row;
    },
    setAnyRow(row: typeof anyRow) {
      anyRow = row;
    },
    getFilterCalls() {
      return filterCallsByQuery;
    },
    from() {
      const queryIndex = nextQueryIndex;
      nextQueryIndex += 1;
      return {
        select: () => buildSelectChain(queryIndex),
      };
    },
    resetQueryIndex() {
      nextQueryIndex = 0;
      filterCallsByQuery.length = 0;
    },
  };
}

const videoAssetsMock = createVideoAssetsTableMock();

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
        return videoAssetsMock.from();
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
    videoAssetsMock.resetQueryIndex();
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
    videoAssetsMock.setOwnedRow({ data: null, error: null });
    videoAssetsMock.setAnyRow({ data: null, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("accepts the owner when the stored wallet address uses mixed case", async () => {
    videoAssetsMock.setOwnedRow({
      data: {
        asset_id: ASSET_ID,
        creator_id: "0xCcCc" + OWNER.slice(6),
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

    const filterCalls = videoAssetsMock.getFilterCalls();
    expect(filterCalls[0]).toEqual([
      { operator: "eq", column: "asset_id", value: ASSET_ID },
      { operator: "ilike", column: "creator_id", value: OWNER.toLowerCase() },
    ]);
  });

  it("rejects another creator's asset (owner filter miss, asset-only fallback)", async () => {
    videoAssetsMock.setOwnedRow({ data: null, error: null });
    videoAssetsMock.setAnyRow({
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

    const filterCalls = videoAssetsMock.getFilterCalls();
    expect(filterCalls[0]).toContainEqual({ operator: "eq", column: "asset_id", value: ASSET_ID });
    expect(filterCalls[0]).toContainEqual({
      operator: "ilike",
      column: "creator_id",
      value: OWNER.toLowerCase(),
    });
    expect(filterCalls[1]).toEqual([{ operator: "eq", column: "asset_id", value: ASSET_ID }]);
  });

  it("rejects missing asset", async () => {
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
