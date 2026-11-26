/**
 * Alchemy transport that never throws while being constructed.
 *
 * `alchemy({ apiKey })` from `@account-kit/infra` validates its config with zod
 * and raises `ZodError: invalid_union` (one branch each for apiKey / jwt /
 * rpcUrl) when no credential is supplied. Because several modules build their
 * client at module scope, an empty `NEXT_PUBLIC_ALCHEMY_API_KEY` throws during
 * import and `next build` dies with:
 *
 *   Failed to collect configuration for /api/internal/sign-jwt
 *
 * A missing key must degrade at runtime, never take the build down. Use this
 * helper instead of calling `alchemy()` with an env value directly.
 */

import { alchemy, type AlchemyTransport } from "@account-kit/infra";
import { http, type Transport } from "viem";

/** Public, rate-limited endpoints used only when no Alchemy key is configured. */
export const PUBLIC_RPC_FALLBACKS: Record<string, string> = {
  "base-mainnet": "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org",
  "story-mainnet": "https://mainnet.storyrpc.io",
  "story-testnet": "https://aeneid.storyrpc.io",
};

function clean(value?: string | null): string | undefined {
  const trimmed = value?.trim().replace(/^["']|["']$/g, "");
  return trimmed || undefined;
}

/**
 * The Alchemy key for the current runtime. Server uses the private key, browser
 * uses the public one (a browser bundle can only ever see NEXT_PUBLIC_*).
 */
export function getAlchemyApiKey(): string | undefined {
  if (typeof window !== "undefined") {
    return clean(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
  }
  return clean(process.env.ALCHEMY_API_KEY) ?? clean(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
}

/** Alchemy transport when a key exists, otherwise a public HTTP fallback. */
export function getAlchemyTransport(network = "base-mainnet"): Transport | AlchemyTransport {
  const apiKey = getAlchemyApiKey();
  if (apiKey) return alchemy({ apiKey });
  return http(PUBLIC_RPC_FALLBACKS[network] ?? PUBLIC_RPC_FALLBACKS["base-mainnet"]);
}
