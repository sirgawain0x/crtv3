/**
 * Reproduces the second production build failure:
 *   Failed to collect configuration for /api/livepeer/token-gate
 *   TypeError: Cannot read properties of undefined (reading 'chainAgnosticUrl')
 *
 * Account Kit's createConfig() expects an AlchemyTransport and dereferences
 * `.config`, so a bare viem http() transport (the fallback) is not enough.
 * Run with ALCHEMY_API_KEY / NEXT_PUBLIC_ALCHEMY_API_KEY unset.
 */
import { getAlchemyTransport } from "../lib/web3/alchemy-key";

console.log("public key present:", Boolean(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY));

try {
  const { createConfig } = await import("@account-kit/core");
  // Must match config.ts: Account Kit's own chain, not viem's — createConfig
  // requires an Alchemy-defined chain ("chain must include an alchemy rpc url").
  const { base } = await import("@account-kit/infra");
  createConfig({ transport: getAlchemyTransport("base-mainnet") as never, chain: base, ssr: true });
  console.log("createConfig OK");
} catch (error) {
  console.error("createConfig THREW:", error instanceof Error ? error.message : error);
  process.exit(1);
}
