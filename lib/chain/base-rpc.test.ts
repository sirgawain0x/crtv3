import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBaseRpcUrl } from "./base-rpc";

beforeEach(() => {
  for (const key of ["BASE_RPC_URL", "ALCHEMY_RPC_URL", "ALCHEMY_API_KEY", "NEXT_PUBLIC_ALCHEMY_RPC_URL", "NEXT_PUBLIC_BASE_RPC_URL"]) vi.stubEnv(key, "");
  vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "browser-key");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Base RPC credential selection", () => {
  it("uses the server key for membership and smart-wallet verification", () => {
    vi.stubEnv("ALCHEMY_API_KEY", "server-key");
    expect(getBaseRpcUrl()).toBe("https://base-mainnet.g.alchemy.com/v2/server-key");
  });
  it("honors the explicit server endpoint", () => {
    vi.stubEnv("BASE_RPC_URL", "https://rpc.example/base");
    vi.stubEnv("ALCHEMY_API_KEY", "server-key");
    expect(getBaseRpcUrl()).toBe("https://rpc.example/base");
  });
  it("never falls back to the origin-restricted browser key on the server", () => {
    expect(getBaseRpcUrl()).toBe("https://mainnet.base.org");
  });
  it("uses only public credentials in the browser", () => {
    vi.stubGlobal("window", {});
    vi.stubEnv("ALCHEMY_API_KEY", "server-key");
    vi.stubEnv("BASE_RPC_URL", "https://private.example/base");
    expect(getBaseRpcUrl()).toBe("https://base-mainnet.g.alchemy.com/v2/browser-key");
  });
});
