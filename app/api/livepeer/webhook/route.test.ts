import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/video-provider/config", () => ({
  resolveVideoProviderId: vi.fn(),
}));

vi.mock("@/lib/video-provider/frameworks/webhooks", () => ({
  verifyFrameworksWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/video-provider/frameworks/handle-frameworks-webhook", () => ({
  handleFrameworksWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/livepeer/verify-webhook", () => ({
  verifyLivepeerWebhookSignature: vi.fn(),
}));

vi.mock("@/services/streams", () => ({
  markStreamLiveByStreamId: vi.fn(),
  markStreamOfflineByStreamId: vi.fn(),
}));

vi.mock("@/services/livestream-recordings", () => ({
  persistRecordingAsset: vi.fn(),
  finalizeStreamRecordings: vi.fn(),
}));

import { resolveVideoProviderId } from "@/lib/video-provider/config";
import { verifyFrameworksWebhookSignature } from "@/lib/video-provider/frameworks/webhooks";
import { handleFrameworksWebhookEvent } from "@/lib/video-provider/frameworks/handle-frameworks-webhook";
import { verifyLivepeerWebhookSignature } from "@/lib/livepeer/verify-webhook";

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/livepeer/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/livepeer/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses FrameWorks verifier in frameworks mode", async () => {
    vi.mocked(resolveVideoProviderId).mockReturnValue("frameworks");
    vi.mocked(verifyFrameworksWebhookSignature).mockReturnValue(true);
    vi.mocked(handleFrameworksWebhookEvent).mockResolvedValue("processed");

    const body = JSON.stringify({ id: "evt-1", type: "stream.live", data: {} });
    const response = await POST(makeRequest(body));
    expect(response.status).toBe(200);
    expect(verifyFrameworksWebhookSignature).toHaveBeenCalled();
    expect(verifyLivepeerWebhookSignature).not.toHaveBeenCalled();
  });

  it("returns 401 when FrameWorks signature is invalid", async () => {
    vi.mocked(resolveVideoProviderId).mockReturnValue("frameworks");
    vi.mocked(verifyFrameworksWebhookSignature).mockReturnValue(false);

    const response = await POST(makeRequest("{}"));
    expect(response.status).toBe(401);
  });

  it("keeps Livepeer verifier when provider is livepeer", async () => {
    vi.mocked(resolveVideoProviderId).mockReturnValue("livepeer");
    vi.mocked(verifyLivepeerWebhookSignature).mockReturnValue(true);

    const response = await POST(
      makeRequest(JSON.stringify({ event: "stream.started", streamId: "s1" }), {
        "Livepeer-Signature": "t=1,v1=abc",
      }),
    );
    expect(response.status).toBe(200);
    expect(verifyLivepeerWebhookSignature).toHaveBeenCalled();
  });
});
