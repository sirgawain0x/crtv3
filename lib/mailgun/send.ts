import { serverLogger } from "@/lib/utils/logger";

export type MailgunSendParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  tags?: string[];
};

export type MailgunSendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from =
    process.env.MAILGUN_FROM ??
    (domain ? `newsletter@${domain}` : undefined);

  return { apiKey, domain, from };
}

export function isMailgunConfigured(): boolean {
  const { apiKey, domain, from } = getMailgunConfig();
  return Boolean(apiKey && domain && from);
}

/** Sends one message via Mailgun HTTP API. No-op with error when not configured. */
export async function sendMailgunMessage(
  params: MailgunSendParams
): Promise<MailgunSendResult> {
  const { apiKey, domain, from: defaultFrom } = getMailgunConfig();
  const from = params.from ?? defaultFrom;

  if (!apiKey || !domain || !from) {
    return { ok: false, error: "Mailgun is not configured" };
  }

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", params.to);
  body.set("subject", params.subject);
  body.set("html", params.html);
  if (params.text) {
    body.set("text", params.text);
  }
  if (params.tags?.length) {
    for (const tag of params.tags) {
      body.append("o:tag", tag);
    }
  }

  const url = `https://api.mailgun.net/v3/${domain}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const detail = await response.text();
      serverLogger.error("Mailgun send failed:", response.status, detail);
      return { ok: false, error: `Mailgun HTTP ${response.status}` };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? "unknown" };
  } catch (error) {
    serverLogger.error("Mailgun send error:", error);
    return { ok: false, error: "Mailgun request failed" };
  }
}
