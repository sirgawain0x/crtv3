import { createHmac, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { resetFrameworksWebhookDedupeForTests } from "@/lib/video-provider/frameworks/webhook-dedupe";
import { getVideoProvider } from "@/lib/video-provider";
import {
  markStreamLiveByStreamId,
  markStreamOfflineByStreamId,
} from "@/services/streams";
import { persistRecordingAsset } from "@/services/livestream-recordings";

// Keep the real route, provider selector, HMAC verifier, event handler and dedupe.
// Only the external provider and persistence boundaries are replaced.
vi.mock("@/lib/video-provider", () => ({ getVideoProvider: vi.fn() }));
vi.mock("@/services/streams", () => ({
  markStreamLiveByStreamId: vi.fn(),
  markStreamOfflineByStreamId: vi.fn(),
}));
vi.mock("@/services/livestream-recordings", () => ({
  persistRecordingAsset: vi.fn(),
  finalizeStreamRecordings: vi.fn(),
}));
vi.mock("@/lib/livepeer/studio-api", () => ({ getLivepeerAsset: vi.fn() }));
vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const now = new Date("2026-11-19T15:00:00Z");
const webhookUrl = "https://example.invalid/api/livepeer/webhook";

describe("FrameWorks signed webhook route (#409)", () => {
  let signingKey: Buffer;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    resetFrameworksWebhookDedupeForTests();
    signingKey = randomBytes(32);
    vi.stubEnv("VIDEO_PROVIDER", "frameworks");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${signingKey.toString("base64")}`);
  });

  afterEach(() => {
    resetFrameworksWebhookDedupeForTests();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  function eventBody(type = "webhook.test", data: Record<string, unknown> = {}) {
    return JSON.stringify({
      id: "evt-local-verification",
      type,
      api_version: "v1",
      created_at: now.toISOString(),
      data,
    });
  }

  function signedRequest(body: string, options: {
    sentBody?: string;
    offsetSeconds?: number;
    key?: Buffer;
    additionalSignature?: boolean;
  } = {}) {
    const timestamp = String(Math.floor(now.getTime() / 1000) + (options.offsetSeconds ?? 0));
    const signature = createHmac("sha256", options.key ?? signingKey)
      .update(`evt-local-verification.${timestamp}.${body}`)
      .digest("base64");
    return new NextRequest(webhookUrl, {
      method: "POST",
      body: options.sentBody ?? body,
      headers: {
        "Content-Type": "application/json",
        "webhook-id": "evt-local-verification",
        "webhook-timestamp": timestamp,
        "webhook-signature": `${options.additionalSignature ? "v1,invalid " : ""}v1,${signature}`,
      },
    });
  }

  function expectNoExternalWork() {
    expect(getVideoProvider).not.toHaveBeenCalled();
    expect(markStreamLiveByStreamId).not.toHaveBeenCalled();
    expect(markStreamOfflineByStreamId).not.toHaveBeenCalled();
    expect(persistRecordingAsset).not.toHaveBeenCalled();
  }

  it("accepts the signed provider test event without contacting a provider or database", async () => {
    const response = await POST(signedRequest(eventBody("webhook.test", { endpointId: "endpoint-local" })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expectNoExternalWork();
  });

  it("rejects byte-level tampering before any external work", async () => {
    const body = eventBody();
    const response = await POST(signedRequest(body, { sentBody: `${body}\n` }));
    expect(response.status).toBe(401);
    expectNoExternalWork();
    // A rejected attempt must not consume the event ID.
    expect((await POST(signedRequest(body))).status).toBe(200);
  });

  it.each([-301, 301])("rejects signed timestamps %i seconds from now", async (offsetSeconds) => {
    const response = await POST(signedRequest(eventBody(), { offsetSeconds }));
    expect(response.status).toBe(401);
    expectNoExternalWork();
  });

  it("rejects an otherwise valid event signed by another endpoint's key", async () => {
    const response = await POST(signedRequest(eventBody(), { key: randomBytes(32) }));
    expect(response.status).toBe(401);
    expectNoExternalWork();
  });

  it("accepts a matching signature when the header contains several signatures", async () => {
    expect((await POST(signedRequest(eventBody(), { additionalSignature: true }))).status).toBe(200);
    expectNoExternalWork();
  });

  it.each([
    ["stream.live", markStreamLiveByStreamId],
    ["stream.idle", markStreamOfflineByStreamId],
  ] as const)("verifies %s before dispatching to persistence and dedupes in the same instance", async (type, persist) => {
    const body = eventBody(type, { streamId: "stream-local" });
    expect((await POST(signedRequest(body))).status).toBe(200);
    expect((await POST(signedRequest(body))).status).toBe(204);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith("stream-local");
    expect(getVideoProvider).not.toHaveBeenCalled();
  });

  it("resolves a signed v1 artifactId to the provider hash and permits retry after lookup failure", async () => {
    const artifactHash = "recording-hash-local";
    const asset = {
      id: artifactHash,
      playbackId: "playback-local",
      status: { phase: "ready" },
      source: { type: "recording", streamId: "stream-local" },
    };
    const getAsset = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(asset);
    vi.mocked(getVideoProvider).mockReturnValue({ assets: { get: getAsset } } as never);
    const body = eventBody("recording.ready", {
      // Public v1 payloads use artifactId, not the GraphQL artifactHash field.
      artifact: { artifactId: artifactHash },
    });

    expect((await POST(signedRequest(body))).status).toBe(500);
    expect(persistRecordingAsset).not.toHaveBeenCalled();
    expect((await POST(signedRequest(body))).status).toBe(200);
    expect((await POST(signedRequest(body))).status).toBe(204);
    expect(getAsset).toHaveBeenCalledTimes(2);
    expect(getAsset).toHaveBeenNthCalledWith(1, artifactHash);
    expect(getAsset).toHaveBeenNthCalledWith(2, artifactHash);
    expect(persistRecordingAsset).toHaveBeenCalledTimes(1);
    expect(persistRecordingAsset).toHaveBeenCalledWith(asset, { streamId: "stream-local" });
  });
});
