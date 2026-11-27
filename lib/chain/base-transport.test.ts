import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBaseTransport,
  getBasePublicClient,
  resetBasePublicClientForTests,
  resolveAlchemyApiKey,
} from "./base-transport";

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
  resetBasePublicClientForTests();
});

function clearAllRpcEnv() {
  for (const name of RPC_ENV) vi.stubEnv(name, "");
}

describe("base transport", () => {
  it("constructs with no credentials at all", () => {
    clearAllRpcEnv();
    expect(resolveAlchemyApiKey()).toBeUndefined();
    expect(() => createBaseTransport()).not.toThrow();
  });

  it("builds a Base public client with no credentials", () => {
    clearAllRpcEnv();
    const client = getBasePublicClient();
    expect(client.chain?.id).toBe(8453);
  });

  it("uses the server key and never leaks it to a client context", () => {
    clearAllRpcEnv();
    vi.stubEnv("ALCHEMY_API_KEY", "server-key");
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "public-key");
    expect(resolveAlchemyApiKey()).toBe("server-key");
  });

  it("falls back to the public key when only that is set", () => {
    clearAllRpcEnv();
    vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "public-key");
    expect(resolveAlchemyApiKey()).toBe("public-key");
  });

  it("treats a blank key as absent instead of throwing", () => {
    clearAllRpcEnv();
    vi.stubEnv("ALCHEMY_API_KEY", "   ");
    vi.stubEnv("BASE_RPC_URL", "https://example.invalid/rpc");
    expect(resolveAlchemyApiKey()).toBeUndefined();
    expect(() => createBaseTransport()).not.toThrow();
  });

  it("memoizes the client until reset", () => {
    clearAllRpcEnv();
    const first = getBasePublicClient();
    expect(getBasePublicClient()).toBe(first);
    resetBasePublicClientForTests();
    expect(getBasePublicClient()).not.toBe(first);
  });
});
