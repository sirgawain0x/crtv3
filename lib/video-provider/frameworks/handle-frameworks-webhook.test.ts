import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleFrameworksWebhookEvent } from "./handle-frameworks-webhook";
import { resetFrameworksWebhookDedupeForTests } from "./webhook-dedupe";

vi.mock("@/services/streams", () => ({
  markStreamLiveByStreamId: vi.fn(),
  markStreamOfflineByStreamId: vi.fn(),
}));

vi.mock("@/services/livestream-recordings", () => ({
  persistRecordingAsset: vi.fn(),
  finalizeStreamRecordings: vi.fn(),
}));

vi.mock("../index", () => ({
  getVideoProvider: vi.fn(),
}));

import { getVideoProvider } from "../index";
import {
  finalizeStreamRecordings,
  persistRecordingAsset,
} from "@/services/livestream-recordings";
import {
  markStreamLiveByStreamId,
  markStreamOfflineByStreamId,
} from "@/services/streams";

describe("handleFrameworksWebhookEvent", () => {
  beforeEach(() => {
    resetFrameworksWebhookDedupeForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetFrameworksWebhookDedupeForTests();
  });

  it("maps stream.live to markStreamLiveByStreamId", async () => {
    const result = await handleFrameworksWebhookEvent({
      id: "evt-live",
      type: "stream.live",
      data: { streamId: "stream-1" },
    });

    expect(result).toBe("processed");
    expect(markStreamLiveByStreamId).toHaveBeenCalledWith("stream-1");
  });

  it("maps stream.idle to offline + finalize", async () => {
    const result = await handleFrameworksWebhookEvent({
      id: "evt-idle",
      type: "stream.idle",
      data: { streamId: "stream-2" },
    });

    expect(result).toBe("processed");
    expect(markStreamOfflineByStreamId).toHaveBeenCalledWith("stream-2");
    expect(finalizeStreamRecordings).toHaveBeenCalledWith("stream-2");
  });

  it("deduplicates on event id", async () => {
    const event = { id: "evt-dup", type: "webhook.test", data: {} };
    expect(await handleFrameworksWebhookEvent(event)).toBe("ignored");
    expect(await handleFrameworksWebhookEvent(event)).toBe("duplicate");
  });

  it("resolves recording.ready via artifactId lookup", async () => {
    vi.mocked(getVideoProvider).mockReturnValue({
      assets: {
        get: vi.fn().mockResolvedValue({
          id: "vod-1",
          playbackId: "pb-1",
          status: { phase: "ready" },
          source: { type: "recording", streamId: "stream-3" },
        }),
      },
    } as never);

    await handleFrameworksWebhookEvent({
      id: "evt-rec",
      type: "recording.ready",
      data: {
        artifact: { artifactId: "art-1", playbackId: "" },
        streamId: "stream-3",
      },
    });

    expect(persistRecordingAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: "vod-1", playbackId: "pb-1" }),
      { streamId: "stream-3" },
    );
  });
});
