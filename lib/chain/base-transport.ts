/**
 * Base RPC transport that is safe to construct without credentials.
 *
 * `alchemy()` from `@account-kit/infra` validates its config against
 * `{apiKey} | {jwt} | {rpcUrl}` and throws a ZodError when all three are absent.
 * Called at module scope — as several modules did — that throw happens while Next
 * collects page data, so a build with no RPC credential fails outright even though
 * nothing needs the chain at build time.
 *
 * Configuration follows `getBaseRpcUrl()`'s precedence, branch for branch: on the
 * server an endpoint override outranks the key, and in a browser the public key
 * outranks the public override. Building from the key alone would silently switch
 * endpoints for deployments that set an override for routing or key restrictions.
 *
 * Every branch returns an Alchemy transport: Account Kit configuration reads
 * `chainAgnosticUrl` off it and its `CreateConfigProps` requires `AlchemyTransport`.
 * Clients are created on first use, never at import.
 */

import { alchemy, base } from "@account-kit/infra";
import { createPublicClient, type PublicClient } from "viem";
import { getBaseRpcOverride, getBaseRpcUrl } from "./base-rpc";

/** Server key first, then the public key; never expose the server key to a browser. */
export function resolveAlchemyApiKey(): string | undefined {
  const serverKey = typeof window === "undefined" ? process.env.ALCHEMY_API_KEY?.trim() : undefined;
  return serverKey || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() || undefined;
}

/**
 * Alchemy transport with the resolver's precedence preserved. Never throws.
 *
 * server : override (BASE_RPC_URL | ALCHEMY_RPC_URL) → apiKey → public endpoint
 * browser: public apiKey → public override → public endpoint
 */
export function createBaseTransport(): ReturnType<typeof alchemy> {
  const apiKey = resolveAlchemyApiKey();
  const override = getBaseRpcOverride();

  if (typeof window === "undefined") {
    if (override) return alchemy({ rpcUrl: override });
    if (apiKey) return alchemy({ apiKey });
  } else {
    if (apiKey) return alchemy({ apiKey });
    if (override) return alchemy({ rpcUrl: override });
  }

  // No credential and no override: use the rpcUrl branch of the same schema rather
  // than a plain http transport, which breaks Account Kit's chainAgnosticUrl read.
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
