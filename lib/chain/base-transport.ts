/**
 * Base RPC transport that is safe to construct without credentials.
 *
 * `alchemy()` from `@account-kit/infra` validates its config against
 * `{apiKey} | {jwt} | {rpcUrl}` and throws a ZodError when all three are absent.
 * Called at module scope — as several modules did — that throw happens while Next
 * collects page data, so a build with no RPC credential fails outright even though
 * nothing needs the chain at build time.
 *
 * Construction here is inert: no credential means a plain HTTP transport over
 * `getBaseRpcUrl()` (which falls back to a public Base endpoint). Reads still work;
 * they just do not get Alchemy's rate limits. Clients are created on first use.
 */

import { alchemy, base } from "@account-kit/infra";
import { createPublicClient, http, type PublicClient, type Transport } from "viem";
import { getBaseRpcUrl } from "./base-rpc";

/** Server key first, then the public key; never expose the server key to a browser. */
export function resolveAlchemyApiKey(): string | undefined {
  const serverKey = typeof window === "undefined" ? process.env.ALCHEMY_API_KEY?.trim() : undefined;
  return serverKey || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() || undefined;
}

/** `alchemy()` always — Account Kit configuration reads chainAgnosticUrl off it. Never throws. */
export function createBaseTransport(): Transport {
  const apiKey = resolveAlchemyApiKey();
  if (apiKey) {
    return alchemy({ apiKey });
  }
  // No credential: use the rpcUrl branch of the same schema rather than a plain
  // http transport. Account Kit's createConfig expects an Alchemy transport and
  // failed while reading chainAgnosticUrl when handed http().
  return alchemy({ rpcUrl: getBaseRpcUrl() });
}

let cachedClient: PublicClient | undefined;

/** Memoized Base public client; created on first call, not at import. */
export function getBasePublicClient(): PublicClient {
  if (!cachedClient) {
    cachedClient = createPublicClient({ chain: base, transport: createBaseTransport() }) as PublicClient;
  }
  return cachedClient;
}

/** Test seam: drop the memoized client so env changes are observed. */
export function resetBasePublicClientForTests(): void {
  cachedClient = undefined;
}
