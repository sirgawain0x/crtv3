/**
 * Single source of truth for the Alchemy API key.
 *
 * The server (route handlers, server components, scripts) uses the private
 * `ALCHEMY_API_KEY`. A browser bundle can only ever see `NEXT_PUBLIC_*` values,
 * so the client falls back to `NEXT_PUBLIC_ALCHEMY_API_KEY`, which is kept
 * intentionally narrow: Base mainnet only, locked to the app's origins.
 *
 * Never read the public env var directly outside this module — that ships the
 * key to every visitor and makes rotation a redeploy.
 */

import { alchemy } from "@account-kit/infra";
import { http, type Transport } from "viem";

const PUBLIC_KEY_ENV = "NEXT_PUBLIC_ALCHEMY_API_KEY";

function clean(value?: string | null): string | undefined {
  const trimmed = value?.trim().replace(/^["']|["']$/g, "");
  return trimmed || undefined;
}

/** Server-only key. Returns undefined when it is not configured. */
export function getServerAlchemyApiKey(): string | undefined {
  return clean(process.env.ALCHEMY_API_KEY) ?? clean(process.env.BASE_ALCHEMY_API_KEY);
}

let warnedAboutPublicFallback = false;

/**
 * The key to use for Alchemy calls from the current runtime.
 *
 * Server: `ALCHEMY_API_KEY`, falling back to the public key so a deploy that
 * has not set the private value yet keeps working. Browser: the public key.
 */
export function getAlchemyApiKey(): string | undefined {
  if (typeof window !== "undefined") {
    return clean(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
  }

  const serverKey = getServerAlchemyApiKey();
  if (serverKey) return serverKey;

  const publicKey = clean(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
  if (publicKey && !warnedAboutPublicFallback) {
    warnedAboutPublicFallback = true;
    // Plain console here: this module is bundled for the browser too, and the
    // server logger must not be pulled into client chunks.
    console.warn(
      `[alchemy] ALCHEMY_API_KEY is not set — falling back to ${PUBLIC_KEY_ENV}. ` +
        "Set the server-only key so server traffic stops using the public key.",
    );
  }
  return publicKey;
}

/** `true` when some Alchemy credential is available in this runtime. */
export function isAlchemyConfigured(): boolean {
  return Boolean(getAlchemyApiKey());
}

/**
 * JSON-RPC endpoint for a given Alchemy network host, e.g. `base-mainnet`.
 * Callers that need a wallet/bundler URL should build it from the same key.
 */
export function getAlchemyRpcUrl(network = "base-mainnet"): string | undefined {
  const apiKey = getAlchemyApiKey();
  return apiKey ? `https://${network}.g.alchemy.com/v2/${apiKey}` : undefined;
}

/**
 * Public fallbacks, used when no Alchemy key is configured.
 *
 * These are deliberately rate-limited public endpoints: fine as a degraded
 * fallback, not as a production path.
 */
export const PUBLIC_RPC_FALLBACKS: Record<string, string> = {
  "base-mainnet": "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org",
  "story-mainnet": "https://mainnet.storyrpc.io",
  "story-testnet": "https://aeneid.storyrpc.io",
};

/**
 * A viem `Transport` that never throws while being constructed.
 *
 * `alchemy({ apiKey })` from `@account-kit/infra` validates its config with zod
 * at call time and throws `invalid_union` when the key is empty. Because most
 * call sites build their client at module scope, a missing env var therefore
 * fails `next build` with "Failed to collect configuration for <route>" rather
 * than degrading at runtime — a missing key should never take the build down.
 *
 * Use this instead of `alchemy({ apiKey: ... })` anywhere the key comes from the
 * environment.
 */
export function getAlchemyTransport(network = "base-mainnet"): Transport {
  const apiKey = getAlchemyApiKey();
  if (apiKey) return alchemy({ apiKey });
  return http(PUBLIC_RPC_FALLBACKS[network] ?? PUBLIC_RPC_FALLBACKS["base-mainnet"]);
}
