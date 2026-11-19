import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import nativeHandler, { createRelay, MAX_BODY_BYTES, STAGING_WEBHOOK } from "../api/webhook.mjs";

const now = 1_795_089_600_000;
const body = Buffer.from('{"id":"evt-local","type":"webhook.test","data":{"note":"raw bytes ☃"}}\n');

function fixture({ upstreamStatus = 200, upstreamContentType = "application/json", fetchError, bypassPadding = false, ...config } = {}) {
  const key = randomBytes(32);
  const calls = [];
  const bypass = randomBytes(32).toString("hex");
  const webhookSecret = `whsec_${key.toString("base64")}`;
  const fetchImpl = async (...args) => {
      calls.push(args);
      if (fetchError) throw new Error(`Private diagnostic ${bypass}`);
      const response = new Response([204, 205].includes(upstreamStatus) ? null : JSON.stringify({ ok: true, privateDiagnostic: bypass }), {
        status: upstreamStatus,
        headers: {
          "Set-Cookie": `private=${bypass}`,
          Location: `https://example.invalid/?secret=${bypass}`,
          ...(upstreamContentType === null ? {} : { "Content-Type": upstreamContentType }),
        },
      });
      if (upstreamContentType === null) response.headers.delete("content-type");
      return response;
  };
  const relay = createRelay({
    webhookSecret,
    bypassSecret: bypassPadding ? ` \t${bypass}\r\n` : bypass,
    now: () => now,
    fetchImpl,
    ...config,
  });
  function request({ payload = body, signedBody = payload, offset = 0, headers = {}, method = "POST", path = "/api/webhook" } = {}) {
    const timestamp = String(Math.floor(now / 1000) + offset);
    const signature = createHmac("sha256", key)
      .update(`evt-local.${timestamp}.`).update(signedBody).digest("base64");
    const requestHeaders = new Headers({
      "Content-Type": "application/json",
      "webhook-id": "evt-local",
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    });
    for (const [name, value] of Object.entries(headers)) requestHeaders.set(name, value);
    return new Request(`https://relay.example.invalid${path}`, {
      method,
      ...(method === "POST" ? { body: payload, duplex: "half" } : {}),
      headers: requestHeaders,
    });
  }
  return { relay, calls, request, bypass, webhookSecret, fetchImpl };
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

for (const [label, text] of [
  ["truncated JSON", "{"], ["null", "null"], ["missing type", "{}"], ["numeric type", '{"type":42}'],
]) {
  test(`rejects signed ${label} event body without forwarding`, async () => {
    const f = fixture();
    assert.equal((await f.relay(f.request({ payload: Buffer.from(text) }))).status, 400);
    assert.equal(f.calls.length, 0);
  });
}

for (const [label, signature] of [
  ["missing", ""], ["nonmatching", "v1,invalid"], ["non-ASCII", `v1,${"é".repeat(44)}`], ["unsupported version", "v2,invalid"],
]) {
  test(`rejects ${label} signature without throwing or forwarding`, async () => {
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

for (const [label, config] of [
  ["missing webhook key", { webhookSecret: undefined }],
  ["malformed webhook key", { webhookSecret: "not-a-key" }],
  ["missing bypass key", { bypassSecret: undefined }],
  ["empty bypass key", { bypassSecret: "" }],
  ["whitespace-only bypass key", { bypassSecret: " \t\n" }],
  ["interior whitespace in bypass key", { bypassSecret: "one two" }],
]) {
  test(`fails closed for ${label}`, async () => {
    const f = fixture(config);
    assert.equal((await f.relay(f.request())).status, 503);
    assert.equal(f.calls.length, 0);
  });
}

test("trims surrounding bypass-key whitespace before forwarding", async () => {
  const f = fixture({ bypassPadding: true });
  assert.equal((await f.relay(f.request())).status, 200);
  assert.equal(f.calls[0][1].headers.get("x-vercel-protection-bypass"), f.bypass);
});

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

for (const [label, options] of [
  ["GET method", { method: "GET" }],
  ["unknown path", { path: "/api/other" }],
  ["query string", { path: "/api/webhook?destination=https://tv.creativeplatform.xyz" }],
  ["plain-text content", { headers: { "content-type": "text/plain" } }],
  ["compressed content", { headers: { "content-encoding": "gzip" } }],
]) {
  test(`rejects ${label} outside the narrow interface`, async () => {
    const f = fixture();
    const response = await f.relay(f.request(options));
    assert.ok(response.status >= 400);
    if (options.method === "GET") assert.equal(response.headers.get("allow"), "POST");
    assert.equal(f.calls.length, 0);
  });
}

for (const encoding of ["identity", "Identity"]) {
  test(`accepts JSON charset and ${encoding} content encoding`, async () => {
    const f = fixture();
    const response = await f.relay(f.request({ headers: {
      "content-type": "application/json; charset=utf-8", "content-encoding": encoding,
    } }));
    assert.equal(response.status, 200);
  });
}

for (const upstreamContentType of ["text/html", "text/plain", "application/jsonp", null]) {
  test(`rejects upstream 200 with ${upstreamContentType ?? "missing"} content type`, async () => {
    const f = fixture({ upstreamContentType });
    const response = await f.relay(f.request());
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Delivery failed" });
  });
}

for (const upstreamContentType of ["application/json", "Application/JSON; charset=utf-8"]) {
  test(`accepts upstream 200 with ${upstreamContentType} content type`, async () => {
    const f = fixture({ upstreamContentType });
    const response = await f.relay(f.request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
}

for (const upstreamStatus of [201, 202, 205, 206, 302, 401, 429, 500]) {
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
  assert.equal(response.headers.get("content-type"), null);
});

function setTestEnvironment(t, values) {
  // Restore privately; never emit existing environment values.
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

for (const value of [undefined, "false", "TRUE", "1", "true ", "true"]) {
  test(`native Fetch export requires exact true for business events (value: ${JSON.stringify(value) ?? "unset"})`, async (t) => {
    const f = fixture();
    setTestEnvironment(t, {
      FRAMEWORKS_WEBHOOK_SECRET: f.webhookSecret,
      STAGING_VERCEL_BYPASS_SECRET: f.bypass,
      FRAMEWORKS_RELAY_ALLOW_BUSINESS_EVENTS: value,
    });
    t.mock.method(Date, "now", () => now);
    t.mock.method(globalThis, "fetch", f.fetchImpl);
    const payload = Buffer.from('{"id":"evt-local","type":"stream.live","data":{"streamId":"local"}}');
    const response = await nativeHandler.fetch(f.request({ payload }));
    assert.equal(response.status, value === "true" ? 200 : 503);
    assert.equal(f.calls.length, value === "true" ? 1 : 0);
  });
}

test("native Fetch export wires both private keys and permits a delivery probe by default", async (t) => {
  const f = fixture();
  setTestEnvironment(t, {
    FRAMEWORKS_WEBHOOK_SECRET: f.webhookSecret,
    STAGING_VERCEL_BYPASS_SECRET: f.bypass,
    FRAMEWORKS_RELAY_ALLOW_BUSINESS_EVENTS: undefined,
  });
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", f.fetchImpl);
  assert.equal((await nativeHandler.fetch(f.request())).status, 200);
  assert.equal(f.calls[0][1].headers.get("x-vercel-protection-bypass"), f.bypass);
});

test("standalone static output contains only the generic error page, not source or operational files", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
  const output = await realpath(path.resolve(root, config.outputDirectory));
  assert.notEqual(output, await realpath(root));
  assert.ok(output.startsWith(`${await realpath(root)}${path.sep}`));
  const entries = await readdir(output, { withFileTypes: true });
  assert.deepEqual(entries.map((entry) => entry.name).sort(), ["404.html"]);
  assert.ok(entries.every((entry) => entry.isFile() && !entry.isSymbolicLink()));
  assert.equal(config.installCommand, "");
  assert.equal(config.buildCommand, "");
  assert.equal(config.framework, null);
});
