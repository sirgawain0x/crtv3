/**
 * POAP Auth0 Token Utility
 * 
 * Fetches access tokens from the new POAP Auth0 endpoint:
 * - URL: https://auth.accounts.poap.xyz/oauth/token
 * - Audience: https://api.poap.tech
 */

interface Auth0TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetches a POAP access token from Auth0 using client credentials
 * @returns Promise<string> The access token
 */
export async function getPoapAccessToken(): Promise<string> {
  const clientId = process.env.POAP_CLIENT_ID;
  const clientSecret = process.env.POAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "POAP_CLIENT_ID and POAP_CLIENT_SECRET environment variables are required"
    );
  }

  const response = await fetch("https://auth.accounts.poap.xyz/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audience: "https://api.poap.tech",
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch POAP access token: ${response.status} ${errorText}`
    );
  }

  const data: Auth0TokenResponse = await response.json();
  return data.access_token;
}

/**
 * Cached token with expiration tracking
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Gets a POAP access token with caching to avoid unnecessary API calls
 * Tokens are cached until they expire (with a 5 minute buffer)
 * @returns Promise<string> The access token
 */
export async function getCachedPoapAccessToken(): Promise<string> {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  // Return cached token if it's still valid
  if (cachedToken && cachedToken.expiresAt > now + bufferMs) {
    return cachedToken.token;
  }

  // Fetch new token with expiration info
  const clientId = process.env.POAP_CLIENT_ID;
  const clientSecret = process.env.POAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "POAP_CLIENT_ID and POAP_CLIENT_SECRET environment variables are required"
    );
  }

  const response = await fetch("https://auth.accounts.poap.xyz/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audience: "https://api.poap.tech",
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch POAP access token: ${response.status} ${errorText}`
    );
  }

  const data: Auth0TokenResponse = await response.json();
  
  // Cache the token using the actual expiration time from Auth0
  // expires_in is in seconds, convert to milliseconds
  const expiresInMs = (data.expires_in || 86400) * 1000; // Default to 24 hours if not provided
  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresInMs - bufferMs, // Subtract buffer to refresh early
  };

  return data.access_token;
}

