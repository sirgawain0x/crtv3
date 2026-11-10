import { describe, expect, it, vi } from "vitest";
import { listVideoAssetsFromSupabase } from "./db-video-assets";
import { buildInventoryReport } from "./inventory";
import { listAllStudioAssets, mapStudioAssetJson } from "./studio-asset-client";
import type { StudioAssetRecord, VideoAssetDbRow } from "./types";

describe("mapStudioAssetJson", () => {
  it("extracts core fields without exposing URLs", () => {
    const mapped = mapStudioAssetJson({
      id: "asset-1",
      playbackId: "pb-1",
      name: "Test",
      status: { phase: "ready" },
      size: 1024,
      videoSpec: { duration: 12.5 },
      downloadUrl: "https://secret.example/download",
      source: { url: "https://secret.example/source" },
    });
    expect(mapped).toMatchObject({
      assetId: "asset-1",
      playbackId: "pb-1",
      sizeBytes: 1024,
      durationSeconds: 12.5,
      hasDownloadUrl: true,
      hasSourceUrl: true,
    });
  });
});

describe("listStudioAssetsPage pagination", () => {
  it("follows opaque cursor across pages", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("cursor=cursor-2")) {
        return new Response(
          JSON.stringify([
            {
              id: "a3",
              playbackId: "p3",
              status: { phase: "ready" },
              downloadUrl: "https://x",
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify([
          { id: "a1", playbackId: "p1", status: { phase: "ready" }, downloadUrl: "https://x" },
          { id: "a2", playbackId: "p2", status: { phase: "ready" }, downloadUrl: "https://x" },
        ]),
        { status: 200, headers: { "x-next-cursor": "cursor-2" } },
      );
    });

    const all = await listAllStudioAssets({
      baseUrl: "https://livepeer.studio",
      authToken: "t",
      pageSize: 2,
      fetchImpl,
    });
    expect(all).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("buildInventoryReport orphan detection", () => {
  const studio: StudioAssetRecord[] = [
    {
      assetId: "studio-linked",
      playbackId: "pb",
      name: "linked",
      statusPhase: "ready",
      sizeBytes: 100,
      durationSeconds: 1,
      hasDownloadUrl: true,
      hasSourceUrl: false,
    },
    {
      assetId: "studio-only",
      playbackId: "pb2",
      name: "orphan",
      statusPhase: "ready",
      sizeBytes: 50,
      durationSeconds: 2,
      hasDownloadUrl: true,
      hasSourceUrl: false,
    },
  ];

  const db: VideoAssetDbRow[] = [
    {
      id: 1,
      asset_id: "studio-linked",
      playback_id: "pb",
      title: "Linked",
      status: "published",
      creator_id: "0x1",
    },
    {
      id: 2,
      asset_id: "db-only",
      playback_id: "pb-old",
      title: "Missing in Studio",
      status: "published",
      creator_id: "0x2",
    },
  ];

  it("flags studio-only and db-only orphans", () => {
    const report = buildInventoryReport({
      studioAssets: studio,
      dbRows: db,
      studioApiBaseUrl: "https://livepeer.studio",
    });
    expect(report.totals.studioOrphanCount).toBe(1);
    expect(report.totals.dbOrphanCount).toBe(1);
    expect(report.totals.linkedCount).toBe(1);
    expect(report.totals.totalBytes).toBe(150);
    expect(report.dbOnlyOrphans).toHaveLength(1);
  });
});

describe("listVideoAssetsFromSupabase", () => {
  it("paginates until a short page", async () => {
    const client = {
      from: () => ({
        select: () => ({
          range: async (from: number) => {
            if (from === 0) {
              return {
                data: [{ id: 1, asset_id: "a", playback_id: "p", title: "t", status: "draft", creator_id: "c" }],
                error: null,
              };
            }
            return { data: [], error: null };
          },
        }),
      }),
    };
    const rows = await listVideoAssetsFromSupabase(client);
    expect(rows).toHaveLength(1);
  });
});
