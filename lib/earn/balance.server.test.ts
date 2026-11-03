import { afterEach, describe, expect, it, vi } from "vitest";
import { getEarnUsdcBalance } from "./balance.server";

const owner = "0x0dAfc518f3D24C74d2489F2F416A3D7951eC8684";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configure() {
  vi.stubEnv("BASE_RPC_URL", "");
  vi.stubEnv("ALCHEMY_RPC_URL", "");
  vi.stubEnv("ALCHEMY_API_KEY", "server-test-key");
  vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "browser-test-key");
}

function mockRpc(error?: string) {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body));
    expect(request).toMatchObject({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{
        to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        data: `0x70a08231000000000000000000000000${owner.slice(2).toLowerCase()}`,
      }, "latest"],
    });
    return Response.json({
      jsonrpc: "2.0",
      id: request.id,
      ...(error ? { error: { code: -32600, message: error } } : {
        result: `0x${(2_500_000n).toString(16).padStart(64, "0")}`,
      }),
    });
  });
}

describe("Earn server USDC balance", () => {
  it("reads the balance with the server key instead of the browser key", async () => {
    configure();
    const fetch = mockRpc();
    vi.stubGlobal("fetch", fetch);
    expect(await getEarnUsdcBalance(owner)).toBe(2_500_000n);
    expect(fetch.mock.calls[0][0]).toBe("https://base-mainnet.g.alchemy.com/v2/server-test-key");
  });

  it("uses an explicitly configured Base RPC URL", async () => {
    configure();
    vi.stubEnv("BASE_RPC_URL", "https://base.example/rpc");
    const fetch = mockRpc();
    vi.stubGlobal("fetch", fetch);
    await getEarnUsdcBalance(owner);
    expect(fetch.mock.calls[0][0]).toBe("https://base.example/rpc");
  });

  it("reports an unavailable balance without leaking provider details or returning zero", async () => {
    configure();
    vi.stubGlobal("fetch", mockRpc("Unspecified origin not on whitelist: server-test-key"));
    await expect(getEarnUsdcBalance(owner)).rejects.toThrow(
      /^Unable to load your USDC balance\. Please try again shortly\.$/,
    );
  });

  it("does not fall back to a browser key or a public RPC when server config is absent", async () => {
    configure();
    vi.stubEnv("ALCHEMY_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(getEarnUsdcBalance(owner)).rejects.toThrow("Earn balance service is not configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});
