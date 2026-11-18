import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClip } from "./livepeer-clips";

const { getVideoProvider, getStreamByPlaybackId, providerCreateClip } = vi.hoisted(() => ({
  getVideoProvider: vi.fn(),
  getStreamByPlaybackId: vi.fn(),
  providerCreateClip: vi.fn(),
}));

vi.mock("@/lib/video-provider", () => ({ getVideoProvider }));
vi.mock("@/services/streams", () => ({ getStreamByPlaybackId }));

const request = {
  playbackId: "live-playback",
  sessionId: "session-live-playback",
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_060_000,
};

describe("clip service stream resolution", () => {
  beforeEach(() => {
    getVideoProvider.mockReturnValue({
      id: "frameworks",
      streams: { createClip: providerCreateClip },
    });
    providerCreateClip.mockResolvedValue({
      playbackUrl: "https://example.test/clip.m3u8",
      assetId: "clip",
      newPlaybackId: "clip-playback",
    });
    getStreamByPlaybackId.mockResolvedValue({
      id: "database-row",
      stream_id: "frameworks-stream",
    });
  });

  afterEach(() => vi.resetAllMocks());

  it("resolves the provider stream ID from playback instead of the chat session", async () => {
    await createClip(request);
    expect(getStreamByPlaybackId).toHaveBeenCalledWith(request.playbackId);
    expect(providerCreateClip).toHaveBeenCalledWith({
      ...request,
      streamId: "frameworks-stream",
      name: undefined,
    });
  });

  it("preserves Livepeer session clipping without a stream lookup", async () => {
    getVideoProvider.mockReturnValue({
      id: "livepeer",
      streams: { createClip: providerCreateClip },
    });
    await createClip(request);
    expect(getStreamByPlaybackId).not.toHaveBeenCalled();
    expect(providerCreateClip).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: request.sessionId,
    }));
  });

  it.each([null, { id: "database-row" }])(
    "rejects an absent provider stream ID before clip creation",
    async (stream) => {
      getStreamByPlaybackId.mockResolvedValue(stream);
      const result = await createClip(request);
      expect(result.error).toBe("Stream not found for playback ID");
      expect(providerCreateClip).not.toHaveBeenCalled();
    },
  );

  it("returns a lookup failure without creating a clip", async () => {
    getStreamByPlaybackId.mockRejectedValue(new Error("Stream lookup failed"));
    const result = await createClip(request);
    expect(result.error).toBe("Stream lookup failed");
    expect(providerCreateClip).not.toHaveBeenCalled();
  });

  it("returns a provider failure through the existing result contract", async () => {
    providerCreateClip.mockRejectedValue(new Error("Clip unavailable"));
    expect((await createClip(request)).error).toBe("Clip unavailable");
  });
});
