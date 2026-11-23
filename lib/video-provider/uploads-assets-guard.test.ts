import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertUploadsAndAssetsAvailable,
  resetVideoProviderForTests,
} from "./index";
import { getLivepeerAsset } from "@/lib/livepeer/studio-api";

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

const fetchMock = vi.fn();

describe("uploads/assets guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  describe("frameworks mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "frameworks");
      vi.stubEnv("FRAMEWORKS_API_TOKEN", "token");
      vi.stubGlobal("fetch", fetchMock);
      resetVideoProviderForTests();
    });

    it("assertUploadsAndAssetsAvailable does not throw", () => {
      expect(() => assertUploadsAndAssetsAvailable("test")).not.toThrow();
    });

    it("studio-api.getLivepeerAsset reaches FrameWorks GraphQL", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            storageArtifactsConnection: { nodes: [] },
          },
        }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            vodAsset: {
              id: "vod1",
              playbackId: "pb1",
              title: "Test",
              status: "READY",
            },
          },
        }),
      });

      const asset = await getLivepeerAsset("vod1");
      expect(asset?.id).toBe("vod1");
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("livepeer mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "livepeer");
      vi.stubEnv("LIVEPEER_FULL_API_KEY", "test-key");
      resetVideoProviderForTests();
    });

    it("does not throw on guard", () => {
      expect(() => assertUploadsAndAssetsAvailable("probe")).not.toThrow();
    });
  });
});
