// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { VideoAsset } from "@/lib/types/video-asset";

vi.mock("@/components/Videos/VideoCard", () => ({
  default: ({ asset }: { asset: { name?: string; title?: string } }) => (
    <div data-testid="video-card">{asset.name ?? asset.title}</div>
  ),
}));

import { FairVideoGrid } from "./FairVideoGrid";

const sampleVideo: VideoAsset = {
  id: 7,
  title: "Mock FAIR Video",
  asset_id: "550e8400-e29b-41d4-a716-446655440000",
  category: "music",
  location: "",
  playback_id: "mock-playback",
  description: null,
  thumbnailUri: "https://example.com/thumb.jpg",
  creator_id: "0xmock",
  status: "published",
  duration: 30,
  views_count: 0,
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

async function renderGrid(videos: VideoAsset[]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  await act(async () => {
    root.render(<FairVideoGrid videos={videos} />);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("FairVideoGrid", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the empty state when there are no videos", async () => {
    const { container, unmount } = await renderGrid([]);
    expect(container.textContent).toMatch(/Videos coming soon/i);
    unmount();
  });

  it("renders a video card for each configured video", async () => {
    const { container, unmount } = await renderGrid([sampleVideo]);
    expect(container.querySelectorAll('[data-testid="video-card"]')).toHaveLength(1);
    expect(container.textContent).toMatch(/Mock FAIR Video/);
    unmount();
  });
});
