import { describe, expect, it, vi } from "vitest";
import { listVideoAssetsFromSupabase } from "./db-video-assets";
import { buildInventoryReport } from "./inventory";
import { parseNextCursorFromLinkHeader } from "./link-header";
import {
  listAllStudioAssets,
  listStudioAssetsPage,
  mapStudioAssetJson,
  StudioAssetPaginationError,
} from "./studio-asset-client";
import type { StudioAssetRecord, VideoAssetDbRow } from "./types";

function assetJson(id: string) {
  return {
    id,
    playbackId: `pb-${id}`,
    status: { phase: "ready" },
    downloadUrl: "https://example.test/dl",
    size: 100,
  };
}

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

describe("parseNextCursorFromLinkHeader", () => {
  it("reads cursor from Link rel=next", () => {
    const link =
      '<https://livepeer.studio/api/asset?limit=2&cursor=skip2&order=updatedAt-true>; rel="next"';
    expect(parseNextCursorFromLinkHeader(link)).toBe("skip2");
  });
});

describe("listStudioAssetsPage pagination", () => {
  it("follows Link rel=next across pages", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("cursor=skip2")) {
        return new Response(JSON.stringify([assetJson("a3")]), {
          status: 200,
          headers: { "X-Total-Count": "3" },
        });
      }
      return new Response(JSON.stringify([assetJson("a1"), assetJson("a2")]), {
        status: 200,
        headers: {
          Link: '<https://livepeer.studio/api/asset?limit=2&cursor=skip2>; rel="next"',
          "X-Total-Count": "3",
        },
      });
    });

    const all = await listAllStudioAssets({
      baseUrl: "https://livepeer.studio",
      authToken: "t",
      pageSize: 2,
      fetchImpl,
    });
    expect(all.assets).toHaveLength(3);
    expect(all.pageCount).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("ends on a short final page without Link", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([assetJson("only")]), {
        status: 200,
        headers: { "X-Total-Count": "1" },
      }),
    );
    const all = await listAllStudioAssets({
      baseUrl: "https://livepeer.studio",
      authToken: "t",
      pageSize: 100,
      fetchImpl,
    });
    expect(all.assets).toHaveLength(1);
    expect(all.pageCount).toBe(1);
  });

  it("throws when a full page has no next cursor", async () => {
    const fullPage = Array.from({ length: 2 }, (_, i) => assetJson(`a${i}`));
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(fullPage), { status: 200 }),
    );
    await expect(
      listStudioAssetsPage(
        { baseUrl: "https://livepeer.studio", authToken: "t", pageSize: 2, fetchImpl },
        null,
      ),
    ).rejects.toThrow(/missing Link rel=next/);
  });

  it("throws on repeated cursor", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([assetJson("a1"), assetJson("a2")]), {
        status: 200,
        headers: {
          Link: '<https://livepeer.studio/api/asset?cursor=loop>; rel="next"',
        },
      }),
    );
    await expect(
      listAllStudioAssets({
        baseUrl: "https://livepeer.studio",
        authToken: "t",
        pageSize: 2,
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(StudioAssetPaginationError);
  });

  it("throws when collected count is below X-Total-Count", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([assetJson("a1")]), {
        status: 200,
        headers: { "X-Total-Count": "99" },
      }),
    );
    await expect(
      listAllStudioAssets({
        baseUrl: "https://livepeer.studio",
        authToken: "t",
        pageSize: 100,
        fetchImpl,
      }),
    ).rejects.toThrow(/X-Total-Count/);
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

  it("keeps studio count separate from db-only orphans", () => {
    const report = buildInventoryReport({
      studioAssets: studio,
      dbRows: db,
      studioApiBaseUrl: "https://livepeer.studio",
    });
    expect(report.totals.studioAssetCount).toBe(2);
    expect(report.totals.dbOrphanCount).toBe(1);
    expect(report.totals.studioOrphanCount).toBe(1);
    expect(report.totals.linkedCount).toBe(1);
    expect(report.totals.totalBytes).toBe(150);
    expect(report.totals.missingOrFailedCount).toBe(0);
    expect(report.studioRows).toHaveLength(2);
    expect(report.dbOnlyOrphans).toHaveLength(1);
    expect(report.rows).toHaveLength(2);
    expect(report.studioOnlyOrphans).toHaveLength(1);
  });
});

describe("listVideoAssetsFromSupabase", () => {
  it("paginates with stable id ordering", async () => {
    const order = vi.fn(() => ({
      range: async (from: number) => {
        if (from === 0) {
          return {
            data: [
              { id: 1, asset_id: "a", playback_id: "p", title: "t", status: "draft", creator_id: "c" },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    }));
    const client = {
      from: () => ({
        select: () => ({ order }),
      }),
    };
    const rows = await listVideoAssetsFromSupabase(client);
    expect(rows).toHaveLength(1);
    expect(order).toHaveBeenCalledWith("id", { ascending: true });
  });
});
