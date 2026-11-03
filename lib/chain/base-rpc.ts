/** Shared reads use server credentials on the server and public credentials in the browser. */
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
