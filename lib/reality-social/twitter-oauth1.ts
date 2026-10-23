import crypto from "node:crypto";

/** RFC 5849 percent-encoding (OAuth 1.0a). */
export function oauthPercentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export type OAuth1Credentials = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export type OAuth1SignInput = {
  method: string;
  url: string;
  credentials: OAuth1Credentials;
  nonce: string;
  timestamp: string;
};

/** Builds `Authorization: OAuth ...` for user-context requests (JSON body is not signed). */
export function buildOAuth1AuthorizationHeader(input: OAuth1SignInput): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.credentials.consumerKey,
    oauth_nonce: input.nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: input.timestamp,
    oauth_token: input.credentials.accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${oauthPercentEncode(key)}=${oauthPercentEncode(oauthParams[key])}`)
    .join("&");

  const signatureBase = [
    input.method.toUpperCase(),
    oauthPercentEncode(input.url),
    oauthPercentEncode(paramString),
  ].join("&");

  const signingKey = `${oauthPercentEncode(input.credentials.consumerSecret)}&${oauthPercentEncode(input.credentials.accessTokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  const headerParams = { ...oauthParams, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map(
        (key) =>
          `${oauthPercentEncode(key)}="${oauthPercentEncode(headerParams[key])}"`,
      )
      .join(", ")
  );
}
