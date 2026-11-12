import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertUploadsAndAssetsAvailable,
  FrameWorksUploadsAssetsUnavailableError,
  resetVideoProviderForTests,
} from "./index";
import {
  createAsset,
  createViaUrl,
  deleteAsset,
  fetchAllAssets,
  fetchAssetId,
  updateAsset,
} from "@/app/api/livepeer/actions";
import {
  getLivepeerAsset as getUploadAsset,
  getLivepeerPlaybackInfo,
  getLivepeerUploadUrl,
} from "@/app/api/livepeer/assetUploadActions";
import {
  getLivepeerAsset,
  listRecentRecordingAssets,
} from "@/lib/livepeer/studio-api";
import { GET as assetByIdGet } from "@/app/api/livepeer/asset/[assetId]/route";
import { POST as livepeerRoutePost } from "@/app/api/livepeer/route";
import { deleteVideoAsset } from "@/services/video-assets";
import requestUploadHandler from "@/app/api/livepeer/asset/request-upload";
import { NextRequest } from "next/server";

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/middleware/botIdGuard", () => ({
  checkBotIdDeep: vi.fn(async () => ({ isBot: false })),
}));

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { standard: vi.fn(async () => null) },
}));

vi.mock("@/lib/sdk/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { creator_id: "0xabc" },
            error: null,
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
  })),
}));

const EXPECTED =
  "FrameWorks uploads/assets not available yet (#406)" as const;

async function expectFrameworksRefusal(run: () => Promise<unknown>) {
  await expect(run()).rejects.toThrow(EXPECTED);
  await expect(run()).rejects.toBeInstanceOf(
    FrameWorksUploadsAssetsUnavailableError,
  );
}

describe("uploads/assets guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
  });

  describe("frameworks mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "frameworks");
      vi.stubEnv("FRAMEWORKS_API_TOKEN", "token");
      resetVideoProviderForTests();
    });

    it("assertUploadsAndAssetsAvailable throws typed error", () => {
      expect(() => assertUploadsAndAssetsAvailable("test")).toThrow(EXPECTED);
    });

    it.each([
      {
        name: "studio-api.getLivepeerAsset",
        run: () => getLivepeerAsset("asset-1"),
      },
      {
        name: "studio-api.listRecentRecordingAssets",
        run: () => listRecentRecordingAssets(5),
      },
      { name: "actions.fetchAllAssets", run: () => fetchAllAssets() },
      { name: "actions.fetchAssetId", run: () => fetchAssetId("asset-1") },
      {
        name: "actions.updateAsset",
        run: () => updateAsset("asset-1", { name: "x" }),
      },
      {
        name: "actions.createAsset",
        run: () => createAsset({ name: "x" } as never),
      },
      {
        name: "actions.createViaUrl",
        run: () => createViaUrl({ url: "https://example.com/v.mp4" } as never),
      },
      { name: "actions.deleteAsset", run: () => deleteAsset("asset-1") },
      {
        name: "assetUploadActions.getLivepeerUploadUrl",
        run: () => getLivepeerUploadUrl("f.mp4", "0xabc"),
      },
      {
        name: "assetUploadActions.getLivepeerAsset",
        run: () => getUploadAsset("asset-1"),
      },
      {
        name: "assetUploadActions.getLivepeerPlaybackInfo",
        run: () => getLivepeerPlaybackInfo("playback-1"),
      },
      {
        name: "video-assets.deleteVideoAsset",
        run: () => deleteVideoAsset("asset-1", "0xabc"),
      },
    ])("$name refuses before provider call", async ({ run }) => {
      await expectFrameworksRefusal(run);
    });

    it("livepeer.route POST returns 503 JSON", async () => {
      const req = new NextRequest("https://crtv.test/api/livepeer", {
        method: "POST",
        body: "{}",
      });
      const res = await livepeerRoutePost(req);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe(EXPECTED);
    });

    it("asset.request-upload handler returns 503 JSON", async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() };
      await requestUploadHandler(
        { method: "POST", body: { filename: "x.mp4" } } as never,
        res as never,
      );
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ error: EXPECTED });
    });

    it("asset.[assetId].GET returns 503 JSON", async () => {
      const assetId = "550e8400-e29b-41d4-a716-446655440000";
      const res = await assetByIdGet(
        new NextRequest(`https://crtv.test/api/livepeer/asset/${assetId}`),
        { params: Promise.resolve({ assetId }) },
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe(EXPECTED);
    });
  });

  describe("livepeer mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "livepeer");
      vi.stubEnv("LIVEPEER_FULL_API_KEY", "test-key");
      resetVideoProviderForTests();
    });

    it("does not throw on guard", () => {
      expect(() =>
        assertUploadsAndAssetsAvailable("probe"),
      ).not.toThrow();
    });

    it("createAsset reaches provider (fails on SDK without mock, not on guard)", async () => {
      await expect(
        createAsset({ name: "probe" } as never),
      ).rejects.not.toThrow(EXPECTED);
    });
  });
});
