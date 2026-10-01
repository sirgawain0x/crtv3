import "server-only";
import type Twit from "twit";

async function loadTwitterClient(): Promise<Twit> {
  const { default: TwitCtor } = await import("twit");
  const consumer_key = process.env.TWITTER_CONSUMER_KEY ?? "";
  const consumer_secret = process.env.TWITTER_CONSUMER_SECRET ?? "";
  const access_token = process.env.TWITTER_ACCESS_TOKEN ?? "";
  const access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET ?? "";

  if (!consumer_key || !consumer_secret || !access_token || !access_token_secret) {
    throw new Error("Twitter credentials are not configured");
  }

  return new TwitCtor({
    consumer_key,
    consumer_secret,
    access_token,
    access_token_secret,
  });
}

/** Posts a status via Twitter API v1.1 (same client as @reality.eth/twitter-bot). */
export async function postTwitterStatus(status: string): Promise<void> {
  const client = await loadTwitterClient();

  await new Promise<void>((resolve, reject) => {
    client.post("statuses/update", { status }, (error, _data, response) => {
      if (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (response && typeof response.statusCode === "number" && response.statusCode >= 400) {
        reject(new Error(`Twitter post failed (${response.statusCode})`));
        return;
      }
      resolve();
    });
  });
}
