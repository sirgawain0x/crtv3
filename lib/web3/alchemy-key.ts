/**
 * Single source of truth for the Alchemy key and transport.
 *
 * Two jobs:
 *
 * 1. **Key split.** Server code prefers the private `ALCHEMY_API_KEY`; a browser
 *    bundle can only ever see `NEXT_PUBLIC_*`, so the client uses
 *    `NEXT_PUBLIC_ALCHEMY_API_KEY`. Never read either variable directly outside
 *    this module.
 * 2. **Build safety.** `alchemy()` validates its config with zod and raises
 *    `ZodError: invalid_union` (one branch each for apiKey / jwt / rpcUrl) when
 *    no credential is supplied. Several modules build an Alchemy client at
 *    module scope, so an empty key used to throw during import and kill
 *    `next build` ("Failed to collect configuration for …"). A missing key must
 *    degrade at runtime, never take the build down.
 */

import { alchemy, type AlchemyTransport } from "@account-kit/infra";

const PUBLIC_KEY_ENV = "NEXT_PUBLIC_ALCHEMY_API_KEY";

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

/** Server-only key. Returns undefined when it is not configured. */
export function getServerAlchemyApiKey(): string | undefined {
  return clean(process.env.ALCHEMY_API_KEY) ?? clean(process.env.BASE_ALCHEMY_API_KEY);
}

let warnedAboutPublicFallback = false;

/**
 * The key to use for Alchemy calls from the current runtime.
 *
 * Browser: the public key only — a client bundle can never see the private one.
 * Server: `ALCHEMY_API_KEY`, falling back to the public key so a deploy that
 * has not set the private value keeps working (warned once).
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
 * Always returns a real `AlchemyTransport` — with the key when configured,
 * otherwise pointed at a public RPC via the `rpcUrl` branch of the same config
 * union.
 *
 * Do NOT return a bare viem `http()` transport as the fallback: Account Kit's
 * `createConfig` requires an AlchemyTransport and dereferences `.config`,
 * failing at build time with
 *   TypeError: Cannot read properties of undefined (reading 'chainAgnosticUrl')
 * (or a zod "Invalid input" from the same validation). Staying on `alchemy()`
 * for both branches keeps every caller — viem clients and Account Kit configs —
 * working whether or not a key is present.
 */
export function getAlchemyTransport(network = "base-mainnet"): AlchemyTransport {
  const apiKey = getAlchemyApiKey();
  if (apiKey) return alchemy({ apiKey });
  return alchemy({
    rpcUrl: PUBLIC_RPC_FALLBACKS[network] ?? PUBLIC_RPC_FALLBACKS["base-mainnet"],
  });
}
