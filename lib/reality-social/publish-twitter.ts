import crypto from "node:crypto";
import "server-only";
import {
  buildOAuth1AuthorizationHeader,
  type OAuth1Credentials,
} from "@/lib/reality-social/twitter-oauth1";

const X_TWEETS_URL = "https://api.x.com/2/tweets";

export type PostTwitterStatusOptions = {
  fetchImpl?: typeof fetch;
  oauthNonce?: string;
  oauthTimestamp?: string;
};

function loadTwitterCredentials(): OAuth1Credentials {
  const consumerKey = process.env.TWITTER_CONSUMER_KEY ?? "";
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET ?? "";
  const accessToken = process.env.TWITTER_ACCESS_TOKEN ?? "";
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET ?? "";

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Twitter credentials are not configured");
  }

  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

type XErrorBody = {
  title?: string;
  detail?: string;
  errors?: Array<{ title?: string; detail?: string; message?: string }>;
};

function formatXApiError(status: number, body: XErrorBody): string {
  const title =
    body.title ??
    body.errors?.[0]?.title ??
    body.errors?.[0]?.message ??
    "Unknown error";
  const detail = body.detail ?? body.errors?.[0]?.detail ?? "";
  const detailSuffix = detail && detail !== title ? `: ${detail}` : "";
  return `Twitter post failed (${status}): ${title}${detailSuffix}`;
}

async function parseXErrorResponse(response: Response): Promise<string> {
  const status = response.status;
  try {
    const body = (await response.json()) as XErrorBody;
    return formatXApiError(status, body);
  } catch {
    return `Twitter post failed (${status})`;
  }
}

/** Posts a tweet via X API v2 `POST /2/tweets` (OAuth 1.0a user context). */
export async function postTwitterStatus(
  status: string,
  options?: PostTwitterStatusOptions,
): Promise<string> {
  const credentials = loadTwitterCredentials();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const nonce = options?.oauthNonce ?? crypto.randomUUID().replace(/-/g, "");
  const timestamp =
    options?.oauthTimestamp ?? String(Math.floor(Date.now() / 1000));

  const authorization = buildOAuth1AuthorizationHeader({
    method: "POST",
    url: X_TWEETS_URL,
    credentials,
    nonce,
    timestamp,
  });

  const response = await fetchImpl(X_TWEETS_URL, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: status }),
  });

  if (!response.ok) {
    throw new Error(await parseXErrorResponse(response));
  }

  const payload = (await response.json()) as { data?: { id?: string; text?: string } };
  const id = payload.data?.id;
  if (!id) {
    throw new Error("Twitter post failed: response missing tweet id");
  }

  return id;
}
