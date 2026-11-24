import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { checkBotId } from "botid/server";

const VIDEO_UUID = "a1b2c3d4-e5f6-1234-9abc-def012345678";
const VIDEO_PK = 42;

const mockVideoLookup = vi.fn();
const mockLinksQuery = vi.fn();
const mockMetadataQuery = vi.fn();

vi.mock("@/lib/middleware/platformApiAccess", () => ({
  requirePlatformApiAccess: vi.fn(async () => ({ allowed: true, tier: "public" })),
}));

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(async () => ({ isBot: false })),
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { generous: vi.fn(async () => null) },
}));

type SupaChain = {
  select: (...args: unknown[]) => SupaChain;
  eq: (...args: unknown[]) => SupaChain;
  or: (...args: unknown[]) => SupaChain;
  in: (...args: unknown[]) => SupaChain;
  order: (...args: unknown[]) => SupaChain;
  limit: (...args: unknown[]) => SupaChain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  then: (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

vi.mock("@/lib/sdk/supabase/service", () => ({
  supabaseService: {
    from: (table: string) => {
      const chain = {} as SupaChain;
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.or = () => chain;
      chain.in = () => chain;
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.maybeSingle = () => {
        if (table === "video_assets") return mockVideoLookup();
        return Promise.resolve({ data: null, error: null });
      };
      chain.then = (resolve) => {
        if (table === "prediction_video_links") return mockLinksQuery().then(resolve);
        if (table === "prediction_market_creations") return mockMetadataQuery().then(resolve);
        return Promise.resolve({ data: null, error: null }).then(resolve);
      };
      return chain;
    },
  },
}));

import { GET } from "./route";

function byVideoRequest(query: string) {
  return new NextRequest(
    `http://localhost/api/predictions/by-video${query}`,
    { method: "GET" },
  );
}

const LINKS = [
  { question_id: "0x" + "1".repeat(64), created_at: "2026-08-30T00:00:00Z" },
  { question_id: "0x" + "2".repeat(64), created_at: "2026-08-29T00:00:00Z" },
];

const METADATA = [
  {
    question_id: "0x" + "1".repeat(64),
    title: "Will this hit 1K views?",
    category: "creative tv",
    question_type: "bool",
    outcomes: ["Yes", "No"],
  },
];

describe("predictions/by-video GET", () => {
  beforeEach(() => {
    vi.mocked(requirePlatformApiAccess).mockResolvedValue({ allowed: true, tier: "public" });
    mockVideoLookup.mockResolvedValue({ data: { id: VIDEO_PK }, error: null });
    mockLinksQuery.mockResolvedValue({
      data: LINKS,
      error: null,
    });
    mockMetadataQuery.mockResolvedValue({ data: METADATA, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(["internal", "x402"] as const)("serves an admitted %s bot without a second human-only check", async tier => {
    vi.mocked(requirePlatformApiAccess).mockResolvedValue({ allowed: true, tier, ...(tier === "x402" ? { paymentResponse: "receipt" } : {}) });
    vi.mocked(checkBotId).mockResolvedValue({ isBot: true } as Awaited<ReturnType<typeof checkBotId>>);
    const response = await GET(byVideoRequest(`?videoAssetId=${VIDEO_UUID}`));
    expect(response.status).toBe(200);
    expect(checkBotId).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    if (tier === "x402") expect(response.headers.get("PAYMENT-RESPONSE")).toBe("receipt");
  });

  it("denies unpaid callers before querying data", async () => {
    vi.mocked(requirePlatformApiAccess).mockResolvedValue({ allowed: false, response: new (await import("next/server")).NextResponse(null, { status: 402 }) });
    expect((await GET(byVideoRequest(`?videoAssetId=${VIDEO_UUID}`))).status).toBe(402);
    expect(mockVideoLookup).not.toHaveBeenCalled();
  });

  it("preserves opaque provider ID case", async () => {
    const response=await GET(byVideoRequest('?videoAssetId=Hash_Case-1'));
    expect(response.status).toBe(200);expect((await response.json()).videoAssetId).toBe('Hash_Case-1');
  });

  it("returns 400 for a missing or malformed videoAssetId", async () => {
    const missing = await GET(byVideoRequest(""));
    expect(missing.status).toBe(400);

    const malformed = await GET(byVideoRequest("?videoAssetId=bad%2Fid"));
    expect(malformed.status).toBe(400);

    const json = await malformed.json();
    expect(json.error).toContain("videoAssetId");
  });

  it("returns an empty list when the video has no links", async () => {
    mockVideoLookup.mockResolvedValue({ data: null, error: null });

    const res = await GET(byVideoRequest(`?videoAssetId=${VIDEO_UUID}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.predictions).toEqual([]);
    expect(mockLinksQuery).not.toHaveBeenCalled();
  });

  it("returns linked question IDs with metadata, newest-first order preserved", async () => {
    const res = await GET(byVideoRequest(`?videoAssetId=${VIDEO_UUID}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.videoAssetId).toBe(VIDEO_UUID);
    expect(json.predictions).toHaveLength(2);
    expect(json.predictions[0]).toMatchObject({
      questionId: "0x" + "1".repeat(64),
      title: "Will this hit 1K views?",
      category: "creative tv",
      questionType: "bool",
      outcomes: ["Yes", "No"],
      createdAt: "2026-08-30T00:00:00Z",
    });
    // Second link has no stored metadata row (admin-created market).
    expect(json.predictions[1]).toMatchObject({
      questionId: "0x" + "2".repeat(64),
      title: null,
      createdAt: "2026-08-29T00:00:00Z",
    });
  });

  it("degrades to ID-only cards when the metadata leg fails", async () => {
    mockMetadataQuery.mockResolvedValue({ data: null, error: new Error("boom") });

    const res = await GET(byVideoRequest(`?videoAssetId=${VIDEO_UUID}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.predictions).toHaveLength(2);
    expect(json.predictions[0].questionId).toBe("0x" + "1".repeat(64));
    expect(json.predictions[0].title).toBeNull();
  });

  it("returns 500 when the links query fails", async () => {
    mockLinksQuery.mockResolvedValue({ data: null, error: new Error("links down") });

    const res = await GET(byVideoRequest(`?videoAssetId=${VIDEO_UUID}`));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("links down");
  });
});