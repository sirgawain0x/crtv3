import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyFrameworksWebhookSignature } from "./webhooks";

function signedHeaders(body: string, secretB64: string) {
  const msgId = "msg_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from(secretB64, "base64");
  const expected = createHmac("sha256", key)
    .update(`${msgId}.${timestamp}.${body}`)
    .digest("base64");
  return {
    "webhook-id": msgId,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${expected}`,
  };
}

describe("frameworks webhook verification (#406)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts valid Standard Webhooks signature", () => {
    const secretB64 = Buffer.from("super-secret-key-32-bytes-long!!").toString("base64");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${secretB64}`);

    const body = '{"type":"stream.live"}';
    expect(verifyFrameworksWebhookSignature(body, signedHeaders(body, secretB64))).toBe(
      true,
    );
  });

  it("rejects invalid signature", () => {
    const secretB64 = Buffer.from("super-secret-key-32-bytes-long!!").toString("base64");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${secretB64}`);

    expect(
      verifyFrameworksWebhookSignature("{}", {
        "webhook-id": "msg",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "webhook-signature": "v1,invalid",
      }),
    ).toBe(false);
  });

  it("rejects when secret is unset (fail closed)", () => {
    delete process.env.FRAMEWORKS_WEBHOOK_SECRET;
    expect(verifyFrameworksWebhookSignature("{}", {})).toBe(false);
  });

  it("rejects stale webhook-timestamp", () => {
    const secretB64 = Buffer.from("super-secret-key-32-bytes-long!!").toString("base64");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${secretB64}`);
    const body = '{"type":"stream.live"}';
    const stale = String(Math.floor(Date.now() / 1000) - 400);
    const key = Buffer.from(secretB64, "base64");
    const expected = createHmac("sha256", key)
      .update(`msg_123.${stale}.${body}`)
      .digest("base64");

    expect(
      verifyFrameworksWebhookSignature(body, {
        "webhook-id": "msg_123",
        "webhook-timestamp": stale,
        "webhook-signature": `v1,${expected}`,
      }),
    ).toBe(false);
  });

  it("rejects missing or non-numeric webhook-timestamp", () => {
    const secretB64 = Buffer.from("super-secret-key-32-bytes-long!!").toString("base64");
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", `whsec_${secretB64}`);
    const body = "{}";

    expect(
      verifyFrameworksWebhookSignature(body, {
        "webhook-id": "msg",
        "webhook-signature": "v1,abc",
      }),
    ).toBe(false);

    expect(
      verifyFrameworksWebhookSignature(body, {
        "webhook-id": "msg",
        "webhook-timestamp": "not-a-timestamp",
        "webhook-signature": "v1,abc",
      }),
    ).toBe(false);
  });
});
