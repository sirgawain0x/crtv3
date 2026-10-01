import crypto from "node:crypto";

type TwitterOAuthConfig = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function oauthHeader(config: TwitterOAuthConfig, method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: config.accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key] ?? "")}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(config.consumerSecret)}&${percentEncode(
    config.accessTokenSecret,
  )}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };
  const header =
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key] ?? "")}"`)
      .join(", ");

  return header;
}

/** Posts a status via Twitter API v1.1 (same API surface as @reality.eth/twitter-bot). */
export async function postTwitterStatus(status: string): Promise<void> {
  const config: TwitterOAuthConfig = {
    consumerKey: process.env.TWITTER_CONSUMER_KEY ?? "",
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET ?? "",
    accessToken: process.env.TWITTER_ACCESS_TOKEN ?? "",
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET ?? "",
  };

  if (
    !config.consumerKey ||
    !config.consumerSecret ||
    !config.accessToken ||
    !config.accessTokenSecret
  ) {
    throw new Error("Twitter credentials are not configured");
  }

  const url = "https://api.twitter.com/1.1/statuses/update.json";
  const body = new URLSearchParams({ status });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader(config, "POST", url),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twitter post failed (${response.status}): ${text.slice(0, 500)}`);
  }
}
