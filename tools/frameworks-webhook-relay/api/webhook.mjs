import { createHmac, timingSafeEqual } from "node:crypto";

// This relay cannot select a destination from request data or environment values.
export const STAGING_WEBHOOK = "https://crtv4-git-staging-creative-projects.vercel.app/api/livepeer/webhook";
export const MAX_BODY_BYTES = 256 * 1024;
const SIGNED_HEADERS = ["webhook-id", "webhook-timestamp", "webhook-signature"];

function reply(status, error) {
  return new Response(status === 204 ? null : JSON.stringify(error ? { error } : { ok: true }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function readBody(request) {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    return { status: 413 };
  }
  if (!request.body) return { body: Buffer.alloc(0) };
  const reader = request.body.getReader();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, 5000);
  try {
    const chunks = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (timedOut) return { status: 408 };
      if (done) return { body: Buffer.concat(chunks, size) };
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { status: 413 };
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    return { status: timedOut ? 408 : 400 };
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

function validSignature(body, headers, key) {
  const expected = createHmac("sha256", key)
    .update(`${headers.get("webhook-id")}.${headers.get("webhook-timestamp")}.`)
    .update(body)
    .digest("base64");
  return headers.get("webhook-signature").split(/\s+/).some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) return false;
    const candidate = Buffer.from(value);
    const expectedBytes = Buffer.from(expected);
    return candidate.length === expectedBytes.length && timingSafeEqual(candidate, expectedBytes);
  });
}

export function createRelay({ webhookSecret, bypassSecret, businessEventsEnabled = false, fetchImpl = fetch, now = Date.now }) {
  return async (request) => {
    const url = new URL(request.url);
    if (url.pathname !== "/api/webhook" || url.search) return reply(404, "Not found");
    if (request.method !== "POST") return reply(405, "POST required");

    const encodedKey = typeof webhookSecret === "string" ? webhookSecret.trim().replace(/^whsec_/, "") : "";
    const key = Buffer.from(encodedKey, "base64");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedKey) || key.length !== 32 ||
        typeof bypassSecret !== "string" || !bypassSecret || /[^\x21-\x7e]/.test(bypassSecret)) {
      return reply(503, "Relay not configured");
    }
    const headers = request.headers;
    const id = headers.get("webhook-id");
    const timestamp = headers.get("webhook-timestamp");
    const signature = headers.get("webhook-signature");
    if (!id || id.length > 200 || !timestamp || !/^\d{1,12}$/.test(timestamp) ||
        Math.abs(Math.floor(now() / 1000) - Number(timestamp)) > 300 || !signature || signature.length > 1024) {
      return reply(401, "Invalid signature");
    }
    if (!/^application\/json(?:\s*;|$)/i.test(headers.get("content-type") ?? "") ||
        ![null, "identity"].includes(headers.get("content-encoding"))) {
      return reply(415, "JSON required");
    }
    const result = await readBody(request);
    if (result.status) return reply(result.status, "Invalid request body");
    if (!validSignature(result.body, headers, key)) return reply(401, "Invalid signature");

    let event;
    try {
      event = JSON.parse(result.body.toString("utf8"));
    } catch {
      return reply(400, "Invalid event");
    }
    if (!event || typeof event.type !== "string" || !event.type) return reply(400, "Invalid event");
    // Preview shares the production database. A delivery probe must not enable
    // business-event writes before their separate backup and approval gate.
    if (event.type !== "webhook.test" && businessEventsEnabled !== true) {
      return reply(503, "Business events are paused");
    }

    const outgoingHeaders = new Headers({
      "Content-Type": "application/json",
      "x-vercel-protection-bypass": bypassSecret,
    });
    for (const name of SIGNED_HEADERS) outgoingHeaders.set(name, headers.get(name));

    try {
      const response = await fetchImpl(STAGING_WEBHOOK, {
        method: "POST",
        headers: outgoingHeaders,
        body: result.body,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      });
      // Neither upstream response bodies nor headers/cookies are exposed or logged.
      if (response.body) await response.body.cancel().catch(() => {});
      return response.ok ? reply(response.status === 204 ? 204 : 200) : reply(502, "Delivery failed");
    } catch {
      return reply(502, "Delivery failed");
    }
  };
}

// Native Vercel Fetch handler: preserves the raw request body without a JSON parser.
export default {
  fetch(request) {
    return createRelay({
      webhookSecret: process.env.FRAMEWORKS_WEBHOOK_SECRET,
      bypassSecret: process.env.STAGING_VERCEL_BYPASS_SECRET,
      businessEventsEnabled: process.env.FRAMEWORKS_RELAY_ALLOW_BUSINESS_EVENTS === "true",
    })(request);
  },
};
