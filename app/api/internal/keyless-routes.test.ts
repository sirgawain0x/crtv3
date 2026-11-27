import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression guard for the keyless build.
 *
 * Both internal playback routes reach lib/utils/metoken-access.ts, which used to
 * call `alchemy({ apiKey })` at module scope. With no RPC credential that throws a
 * ZodError while Next collects page data, so `next build` failed on a deployment
 * that had no key configured. Importing the routes with every RPC credential
 * cleared reproduces that failure locally.
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

describe("keyless route imports", () => {
  it("imports /api/internal/sign-jwt with no RPC credentials", async () => {
    clearAllRpcEnv();
    const mod = await import("./sign-jwt/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("imports /api/internal/playback-info with no RPC credentials", async () => {
    clearAllRpcEnv();
    const mod = await import("./playback-info/route");
    expect(typeof mod.GET).toBe("function");
  });
});
