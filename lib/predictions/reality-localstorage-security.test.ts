import { describe, it, expect, beforeEach, vi } from "vitest";
import { runRealityLocalStorageSecurityMigration } from "./reality-localstorage-security";

describe("runRealityLocalStorageSecurityMigration", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {} as Window);
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      key(index: number) {
        return Object.keys(this.store)[index] ?? null;
      },
      get length() {
        return Object.keys(this.store).length;
      },
    });
    vi.stubGlobal("indexedDB", {
      deleteDatabase: vi.fn(),
    });
  });

  it("removes reality-prefixed keys once and preserves other keys", () => {
    const ls = localStorage as unknown as { store: Record<string, string> };
    ls.store = {
      "reality.rpcUrl.8453": "https://evil.example",
      "reality-eth-wallet": "0xabc",
      "upload-in-progress": "{}",
      "crtv.reality.storage.security.v1": "0",
    };
    delete ls.store["crtv.reality.storage.security.v1"];

    runRealityLocalStorageSecurityMigration();
    expect(ls.store["reality.rpcUrl.8453"]).toBeUndefined();
    expect(ls.store["reality-eth-wallet"]).toBeUndefined();
    expect(ls.store["upload-in-progress"]).toBe("{}");
    expect(ls.store["crtv.reality.storage.security.v1"]).toBe("1");

    ls.store["reality.rpcUrl.1"] = "https://evil.example";
    runRealityLocalStorageSecurityMigration();
    expect(ls.store["reality.rpcUrl.1"]).toBe("https://evil.example");
  });
});
