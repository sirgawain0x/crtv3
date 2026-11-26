/**
 * Alchemy transport that never throws while being constructed.
 *
 * Scope of this module: **build safety only.** It exists because
 * `alchemy({ apiKey })` from `@account-kit/infra` validates its config with zod
 * and raises `ZodError: invalid_union` (one branch each for apiKey / jwt /
 * rpcUrl) when no credential is supplied. Several modules build an Alchemy
 * client at module scope, so an empty key throws during import and `next build`
 * dies with:
 *
 *   Failed to collect configuration for /api/internal/sign-jwt
 *
 * A missing key must degrade at runtime, never take the build down.
 *
 * It deliberately does NOT change which credential each call site uses: every
 * caller previously read `NEXT_PUBLIC_ALCHEMY_API_KEY`, and this helper keeps
 * reading exactly that. Preferring the server-only `ALCHEMY_API_KEY` on the
 * server is a separate behavioural change and is reviewed with the key split,
 * not here.
 */

import { alchemy, type AlchemyTransport } from "@account-kit/infra";

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
 * The key these call sites have always used — the public one, in both runtimes.
 *
 * Keeping the server and browser on the same variable is what makes this change
 * a pure no-op when a key is present. It also means the private
 * `ALCHEMY_API_KEY` is not referenced anywhere in this module, so it cannot be
 * inlined into a client bundle or rendered output.
 */
export function getAlchemyApiKey(): string | undefined {
  return clean(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
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
