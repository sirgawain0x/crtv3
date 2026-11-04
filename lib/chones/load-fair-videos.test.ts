import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetByAssetId = vi.fn();
const mockGetByPlaybackId = vi.fn();
const mockGetById = vi.fn();

vi.mock("@/services/video-assets", () => ({
  getVideoAssetByAssetId: (...args: unknown[]) => mockGetByAssetId(...args),
  getVideoAssetByPlaybackId: (...args: unknown[]) => mockGetByPlaybackId(...args),
  getVideoAssetById: (...args: unknown[]) => mockGetById(...args),
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { loadChonesFairVideos } from "@/lib/chones/load-fair-videos";

const baseVideo = {
  id: 42,
  title: "FAIR pick",
  asset_id: "550e8400-e29b-41d4-a716-446655440000",
  category: "music",
  location: "",
  playback_id: "playback-abc",
  description: null,
  thumbnailUri: "https://example.com/thumb.jpg",
  creator_id: "0xabc",
  status: "published" as const,
  duration: 60,
  views_count: 1,
  likes_count: 0,
  is_minted: false,
  token_id: null,
  contract_address: null,
  minted_at: null,
  mint_transaction_hash: null,
  royalty_percentage: null,
  price: null,
  max_supply: null,
  current_supply: 0,
  metadata_uri: null,
  attributes: null,
  requires_metoken: false,
  metoken_price: null,
  creator_metoken_id: null,
  subtitles_uri: null,
  subtitles: null,
  story_ip_registered: false,
  story_ip_id: null,
  story_ip_registration_tx: null,
  story_ip_registered_at: null,
  story_license_terms_id: null,
  story_license_template_id: null,
  splits_address: null,
  livepeer_attestation_id: null,
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-01"),
};

describe("loadChonesFairVideos", () => {
  beforeEach(() => {
    mockGetByAssetId.mockReset();
    mockGetByPlaybackId.mockReset();
    mockGetById.mockReset();
  });

  it("returns an empty list when config is empty", async () => {
    await expect(loadChonesFairVideos([])).resolves.toEqual([]);
  });

  it("loads published videos from discover URLs", async () => {
    const uuid = baseVideo.asset_id;
    mockGetByAssetId.mockResolvedValue(baseVideo);

    const videos = await loadChonesFairVideos([
      `https://tv.creativeplatform.xyz/discover/${uuid}`,
    ]);

    expect(mockGetByAssetId).toHaveBeenCalledWith(uuid);
    expect(videos).toHaveLength(1);
    expect(videos[0]?.title).toBe("FAIR pick");
  });

  it("loads published videos from watch URLs via playback lookup", async () => {
    mockGetByPlaybackId.mockResolvedValue({ id: baseVideo.id });
    mockGetById.mockResolvedValue(baseVideo);

    const videos = await loadChonesFairVideos([
      "https://tv.creativeplatform.xyz/watch/playback-abc",
    ]);

    expect(mockGetByPlaybackId).toHaveBeenCalledWith("playback-abc");
    expect(mockGetById).toHaveBeenCalledWith(baseVideo.id);
    expect(videos).toHaveLength(1);
  });
});
