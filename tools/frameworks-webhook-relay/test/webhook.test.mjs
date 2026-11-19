import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { test } from "node:test";
import { createRelay, MAX_BODY_BYTES, STAGING_WEBHOOK } from "../api/webhook.mjs";

const now = 1_795_089_600_000;
const body = Buffer.from('{"id":"evt-local","type":"webhook.test","data":{"note":"raw bytes ☃"}}\n');

function fixture({ upstreamStatus = 200, fetchError, ...config } = {}) {
  const key = randomBytes(32);
  const calls = [];
  const bypass = randomBytes(32).toString("hex");
  const relay = createRelay({
    webhookSecret: `whsec_${key.toString("base64")}`,
    bypassSecret: bypass,
    now: () => now,
    fetchImpl: async (...args) => {
      calls.push(args);
      if (fetchError) throw new Error(`Private diagnostic ${bypass}`);
      return new Response([204, 205].includes(upstreamStatus) ? null : `Private upstream body ${bypass}`, {
        status: upstreamStatus,
        headers: { "Set-Cookie": `private=${bypass}`, Location: `https://example.invalid/?secret=${bypass}` },
      });
    },
    ...config,
  });
  function request({ payload = body, signedBody = payload, offset = 0, headers = {}, method = "POST", path = "/api/webhook" } = {}) {
    const timestamp = String(Math.floor(now / 1000) + offset);
    const signature = createHmac("sha256", key)
      .update(`evt-local.${timestamp}.`).update(signedBody).digest("base64");
    return new Request(`https://relay.example.invalid${path}`, {
      method,
      ...(method === "POST" ? { body: payload, duplex: "half" } : {}),
      headers: {
        "Content-Type": "application/json",
        "webhook-id": "evt-local",
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
        ...headers,
      },
    });
  }
  return { relay, calls, request, bypass };
}

test("preserves signed bytes and sends credentials only as headers to the fixed staging route", async () => {
  const f = fixture();
  const input = f.request({ headers: {
    Authorization: "untrusted",
    Cookie: "untrusted",
    "x-vercel-protection-bypass": "untrusted",
    "x-forwarded-host": "tv.creativeplatform.xyz",
  } });
  const response = await f.relay(input);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(f.calls.length, 1);
  const [target, options] = f.calls[0];
  assert.equal(target, STAGING_WEBHOOK);
  assert.equal(new URL(target).search, "");
  assert.deepEqual(options.body, body);
  assert.equal(options.redirect, "manual");
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual([...options.headers.keys()].sort(), [
    "content-type", "webhook-id", "webhook-signature", "webhook-timestamp", "x-vercel-protection-bypass",
  ].sort());
  assert.equal(options.headers.get("x-vercel-protection-bypass"), f.bypass);
  for (const header of ["webhook-id", "webhook-signature", "webhook-timestamp"]) {
    assert.equal(options.headers.get(header), input.headers.get(header));
  }
});

test("rejects byte tampering without forwarding", async () => {
  const f = fixture();
  assert.equal((await f.relay(f.request({ payload: Buffer.concat([body, Buffer.from(" ")]), signedBody: body }))).status, 401);
  assert.equal(f.calls.length, 0);
});

test("pauses signed business events by default before they reach the shared database", async () => {
  const f = fixture();
  const payload = Buffer.from('{"id":"evt-local","type":"stream.live","data":{"streamId":"local"}}');
  assert.equal((await f.relay(f.request({ payload }))).status, 503);
  assert.equal(f.calls.length, 0);
});

test("forwards signed business events only after explicit enablement", async () => {
  const f = fixture({ businessEventsEnabled: true });
  const payload = Buffer.from('{"id":"evt-local","type":"stream.live","data":{"streamId":"local"}}');
  assert.equal((await f.relay(f.request({ payload }))).status, 200);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0][1].body, payload);
});

test("a string truthy value does not bypass the business-event gate", async () => {
  const f = fixture({ businessEventsEnabled: "true" });
  const payload = Buffer.from('{"id":"evt-local","type":"recording.ready","data":{}}');
  assert.equal((await f.relay(f.request({ payload }))).status, 503);
  assert.equal(f.calls.length, 0);
});

for (const text of ["{", "null", "{}", '{"type":42}']) {
  test("rejects signed malformed event bodies without forwarding", async () => {
    const f = fixture();
    assert.equal((await f.relay(f.request({ payload: Buffer.from(text) }))).status, 400);
    assert.equal(f.calls.length, 0);
  });
}

for (const signature of ["", "v1,invalid", `v1,${"é".repeat(44)}`, "v2,invalid"]) {
  test("rejects malformed/nonmatching signature without throwing or forwarding", async () => {
    const f = fixture();
    assert.equal((await f.relay(f.request({ headers: { "webhook-signature": signature } }))).status, 401);
    assert.equal(f.calls.length, 0);
  });
}

for (const offset of [-301, 301]) {
  test(`rejects timestamps ${offset} seconds from now`, async () => {
    const f = fixture();
    assert.equal((await f.relay(f.request({ offset }))).status, 401);
    assert.equal(f.calls.length, 0);
  });
}

test("accepts one matching signature among multiple candidates", async () => {
  const f = fixture();
  const input = f.request();
  input.headers.set("webhook-signature", `v1,invalid ${input.headers.get("webhook-signature")}`);
  assert.equal((await f.relay(input)).status, 200);
});

for (const config of [{ webhookSecret: undefined }, { webhookSecret: "not-a-key" }, { bypassSecret: undefined }]) {
  test("fails closed when private configuration is absent or invalid", async () => {
    const f = fixture(config);
    assert.equal((await f.relay(f.request())).status, 503);
    assert.equal(f.calls.length, 0);
  });
}

test("refuses oversize declared and chunked bodies", async () => {
  const f = fixture();
  assert.equal((await f.relay(f.request({ headers: { "content-length": String(MAX_BODY_BYTES + 1) } }))).status, 413);
  const huge = Buffer.alloc(MAX_BODY_BYTES + 1, 65);
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(huge); },
    cancel() { cancelled = true; },
  });
  assert.equal((await f.relay(f.request({ payload: stream, signedBody: huge }))).status, 413);
  assert.equal(cancelled, true);
  assert.equal(f.calls.length, 0);
});

test("times out a stalled inbound body without forwarding", async () => {
  const f = fixture();
  let cancelled = false;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  const response = await f.relay(f.request({ payload: stream, signedBody: body }));
  assert.equal(response.status, 408);
  assert.equal(cancelled, true);
  assert.equal(f.calls.length, 0);
});

for (const options of [
  { method: "GET" },
  { path: "/api/other" },
  { path: "/api/webhook?destination=https://tv.creativeplatform.xyz" },
  { headers: { "content-type": "text/plain" } },
  { headers: { "content-encoding": "gzip" } },
]) {
  test("rejects methods, paths, queries and media types outside the narrow interface", async () => {
    const f = fixture();
    assert.ok((await f.relay(f.request(options))).status >= 400);
    assert.equal(f.calls.length, 0);
  });
}

for (const upstreamStatus of [302, 401, 429, 500]) {
  test(`does not acknowledge upstream status ${upstreamStatus} or expose its private response`, async () => {
    const f = fixture({ upstreamStatus });
    const response = await f.relay(f.request());
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Delivery failed" });
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("set-cookie"), null);
  });
}

test("does not expose a thrown upstream error or private credentials", async () => {
  const f = fixture({ fetchError: true });
  const response = await f.relay(f.request());
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Delivery failed" });
});

test("preserves successful duplicate acknowledgement without a response body", async () => {
  const f = fixture({ upstreamStatus: 204 });
  const response = await f.relay(f.request());
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
});
