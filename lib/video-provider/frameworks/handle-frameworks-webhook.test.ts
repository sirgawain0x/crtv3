import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleFrameworksWebhookEvent } from "./handle-frameworks-webhook";
import { FrameworksWebhookRetryableError } from "./webhook-errors";
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
import { persistRecordingAsset } from "@/services/livestream-recordings";
import {
  markStreamLiveByStreamId,
  markStreamOfflineByStreamId,
} from "@/services/streams";

describe("handleFrameworksWebhookEvent", () => {
  const getSessions = vi.fn();

  beforeEach(() => {
    resetFrameworksWebhookDedupeForTests();
    vi.clearAllMocks();
    vi.mocked(getVideoProvider).mockReturnValue({
      streams: { getSessions },
      assets: { get: vi.fn() },
    } as never);
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

  it("stream.idle marks offline only and does not scan sessions", async () => {
    const result = await handleFrameworksWebhookEvent({
      id: "evt-idle",
      type: "stream.idle",
      data: { streamId: "stream-2" },
    });

    expect(result).toBe("processed");
    expect(markStreamOfflineByStreamId).toHaveBeenCalledWith("stream-2");
    expect(getSessions).not.toHaveBeenCalled();
  });

  it("deduplicates on event id after successful handling", async () => {
    const event = { id: "evt-dup", type: "webhook.test", data: {} };
    expect(await handleFrameworksWebhookEvent(event)).toBe("ignored");
    expect(await handleFrameworksWebhookEvent(event)).toBe("duplicate");
  });

  it("does not dedupe when the handler throws so a retry can run", async () => {
    vi.mocked(markStreamLiveByStreamId).mockRejectedValueOnce(new Error("db down"));

    await expect(
      handleFrameworksWebhookEvent({
        id: "evt-retry",
        type: "stream.live",
        data: { streamId: "stream-9" },
      }),
    ).rejects.toThrow("db down");

    vi.mocked(markStreamLiveByStreamId).mockResolvedValueOnce(undefined);

    const retry = await handleFrameworksWebhookEvent({
      id: "evt-retry",
      type: "stream.live",
      data: { streamId: "stream-9" },
    });
    expect(retry).toBe("processed");
  });

  it("resolves recording.ready via artifactId lookup", async () => {
    vi.mocked(getVideoProvider).mockReturnValue({
      streams: { getSessions },
      assets: {
        get: vi.fn().mockResolvedValue({
          id: "chapter-1",
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
      expect.objectContaining({ id: "chapter-1", playbackId: "pb-1" }),
      { streamId: "stream-3" },
    );
  });

  it("recording.ready throws retryable error when lookup misses and is not marked processed", async () => {
    vi.mocked(getVideoProvider).mockReturnValue({
      streams: { getSessions },
      assets: {
        get: vi.fn().mockResolvedValue(null),
      },
    } as never);

    await expect(
      handleFrameworksWebhookEvent({
        id: "evt-miss",
        type: "recording.ready",
        data: {
          artifact: { artifactId: "missing-art", playbackId: "" },
          streamId: "stream-5",
        },
      }),
    ).rejects.toBeInstanceOf(FrameworksWebhookRetryableError);

    vi.mocked(getVideoProvider).mockReturnValue({
      streams: { getSessions },
      assets: {
        get: vi.fn().mockResolvedValue({
          id: "chapter-2",
          playbackId: "pb-2",
          status: { phase: "ready" },
          source: { type: "recording", streamId: "stream-5" },
        }),
      },
    } as never);

    const retry = await handleFrameworksWebhookEvent({
      id: "evt-miss",
      type: "recording.ready",
      data: {
        artifact: { artifactId: "missing-art", playbackId: "" },
        streamId: "stream-5",
      },
    });
    expect(retry).toBe("processed");
    expect(persistRecordingAsset).toHaveBeenCalled();
  });
});
