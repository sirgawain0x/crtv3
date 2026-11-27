import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Keyless construction checks for the two module-scope Account Kit configs.
 *
 * `config.ts` (repo root) and `lib/sdk/wallet/migration-config.ts` both build a
 * config at import time. Account Kit's createConfig validates its transport, so
 * with no credential present it threw during page-data collection and failed the
 * build. These import the modules with every RPC credential cleared.
 */

const RPC_ENV = [
  "ALCHEMY_API_KEY",
  "NEXT_PUBLIC_ALCHEMY_API_KEY",
  "BASE_RPC_URL",
  "ALCHEMY_RPC_URL",
  "NEXT_PUBLIC_ALCHEMY_RPC_URL",
  "NEXT_PUBLIC_BASE_RPC_URL",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function clearAllRpcEnv() {
  for (const name of RPC_ENV) vi.stubEnv(name, "");
}

describe("keyless Account Kit config", () => {
  it("constructs the migration config with no RPC credentials", async () => {
    clearAllRpcEnv();
    const mod = await import("../sdk/wallet/migration-config");
    expect(mod.alchemyMigrationConfig).toBeTruthy();
  });

  it("constructs the root app config with no RPC credentials", async () => {
    clearAllRpcEnv();
    const mod = await import("../../config");
    expect(mod.config).toBeTruthy();
  });
});
