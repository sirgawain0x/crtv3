import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyFrameworksWebhookSignature } from "./webhooks";

describe("frameworks webhook verification (#406)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts valid Standard Webhooks signature", () => {
    const secretB64 = Buffer.from("super-secret-key-32-bytes-long!!").toString("base64");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${secretB64}`);

    const body = '{"type":"stream.live"}';
    const msgId = "msg_123";
    const timestamp = "1700000000";
    const key = Buffer.from(secretB64, "base64");
    const expected = createHmac("sha256", key)
      .update(`${msgId}.${timestamp}.${body}`)
      .digest("base64");

    expect(
      verifyFrameworksWebhookSignature(body, {
        "webhook-id": msgId,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${expected}`,
      }),
    ).toBe(true);
  });

  it("rejects invalid signature", () => {
    const secretB64 = Buffer.from("super-secret-key-32-bytes-long!!").toString("base64");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${secretB64}`);

    expect(
      verifyFrameworksWebhookSignature("{}", {
        "webhook-id": "msg",
        "webhook-timestamp": "1",
        "webhook-signature": "v1,invalid",
      }),
    ).toBe(false);
  });

  it("allows when secret is unset (dev)", () => {
    delete process.env.FRAMEWORKS_WEBHOOK_SECRET;
    expect(verifyFrameworksWebhookSignature("{}", {})).toBe(true);
  });
});
