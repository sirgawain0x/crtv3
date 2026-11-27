/**
 * Shared reads use server credentials on the server and public credentials in the browser.
 *
 * An explicit endpoint override is not interchangeable with a key: operators set
 * BASE_RPC_URL / ALCHEMY_RPC_URL to route traffic or to pair a restricted key with
 * a specific endpoint. Callers that build a transport must consult these helpers
 * rather than reading only the key.
 */

/** The configured endpoint override, if any. */
export function getBaseRpcOverride(): string | undefined {
  if (typeof window === "undefined") {
    return process.env.BASE_RPC_URL?.trim() || process.env.ALCHEMY_RPC_URL?.trim() || undefined;
  }
  return (
    process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ||
    undefined
  );
}

/** The configured key, if any. */
export function getBaseRpcApiKey(): string | undefined {
  if (typeof window === "undefined") {
    return process.env.ALCHEMY_API_KEY?.trim() || undefined;
  }
  return process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() || undefined;
}

export function getBaseRpcUrl(): string {
  if (typeof window === "undefined") {
    const rpcUrl = process.env.BASE_RPC_URL?.trim() || process.env.ALCHEMY_RPC_URL?.trim();
    if (rpcUrl) return rpcUrl;
    const apiKey = process.env.ALCHEMY_API_KEY?.trim();
    return apiKey
      ? `https://base-mainnet.g.alchemy.com/v2/${apiKey}`
      : "https://mainnet.base.org";
  }

  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim();
  return (apiKey ? `https://base-mainnet.g.alchemy.com/v2/${apiKey}` : undefined)
    || process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL?.trim()
    || process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim()
    || "https://mainnet.base.org";
}
