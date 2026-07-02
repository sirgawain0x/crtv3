/**
 * Shared helpers for Pinata agent chat (JSONL streaming responses).
 */

export function extractReplyFromJsonl(body: string): string {
  const lines = body.split("\n");
  const parts: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const evt = JSON.parse(line) as {
        type?: string;
        delta?: { text?: string };
      };
      if (evt?.type === "content_delta" && typeof evt.delta?.text === "string") {
        parts.push(evt.delta.text);
      }
    } catch {
      // ignore non-JSON lines
    }
  }
  return parts.join("");
}

export type PinataChatResult = {
  reply: string;
  session?: string;
};

export async function forwardPinataAgentChat(options: {
  baseUrl: string;
  gatewayToken: string;
  message: string;
  session?: string;
  signal?: AbortSignal;
}): Promise<PinataChatResult> {
  const { baseUrl, gatewayToken, message, session, signal } = options;
  const url = `${baseUrl.replace(/\/+$/, "")}/chat`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      message,
      ...(session ? { session } : {}),
    }),
    signal,
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    throw new Error(
      `Pinata agent returned ${upstream.status}${text ? `: ${text.slice(0, 300)}` : ""}`,
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  const raw = await upstream.text();

  if (
    contentType.includes("ndjson") ||
    contentType.includes("event-stream") ||
    /\n\s*\{/.test(raw)
  ) {
    return { reply: extractReplyFromJsonl(raw) };
  }

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(raw) as {
        reply?: string;
        message?: string;
        content?: string;
        session?: string;
      };
      return {
        reply: json.reply ?? json.message ?? json.content ?? "",
        session: json.session,
      };
    } catch {
      return { reply: raw };
    }
  }

  return { reply: raw };
}
