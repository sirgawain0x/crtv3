import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cachedWalletAuth, clearWalletAuth, requestWalletAuth, setWalletAuthOwner } from "./wallet-auth-cache";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T12:00:00Z")); clearWalletAuth(); setWalletAuthOwner(A); });
afterEach(() => vi.useRealTimers());

describe("shared wallet proof", () => {
  it("allows a second consumer to read proof without signing again", async () => {
    const sign = vi.fn().mockResolvedValue("0xsigned");
    expect(cachedWalletAuth(A)).toBeNull();
    const headers = await requestWalletAuth(A, sign);
    expect(cachedWalletAuth(A)).toEqual(headers);
    expect(await requestWalletAuth(A, sign)).toEqual(headers);
    expect(sign).toHaveBeenCalledWith(`Authorize Creative TV request for address ${A} at 1793620800`);
  });
  it("deduplicates simultaneous verification requests", async () => {
    const sign = vi.fn().mockResolvedValue("0xsigned");
    await Promise.all([requestWalletAuth(A, sign), requestWalletAuth(A, sign)]);
    expect(sign).toHaveBeenCalledOnce();
  });
  it("expires without prompting and protects the shared headers from mutation", async () => {
    await requestWalletAuth(A, async () => "0xsigned");
    cachedWalletAuth(A)!["X-Wallet-Signature"] = "0xmodified";
    expect(cachedWalletAuth(A)!["X-Wallet-Signature"]).toBe("0xsigned");
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(cachedWalletAuth(A)).toBeNull();
  });
  it("clears proof on switches and logout, even when returning to the same account", async () => {
    await requestWalletAuth(A, async () => "0xsigned");
    setWalletAuthOwner(B);
    expect(cachedWalletAuth(A)).toBeNull();
    setWalletAuthOwner(A);
    expect(cachedWalletAuth(A)).toBeNull();
    await requestWalletAuth(A, async () => "0xsigned");
    setWalletAuthOwner("");
    setWalletAuthOwner(A);
    expect(cachedWalletAuth(A)).toBeNull();
  });
  it("rejects an old signature that finishes after A → B → A", async () => {
    let resolve!: (signature: string) => void;
    const request = requestWalletAuth(A, () => new Promise((done) => { resolve = done; }));
    await Promise.resolve();
    setWalletAuthOwner(B);
    setWalletAuthOwner(A);
    resolve("0xold");
    await expect(request).rejects.toThrow("account changed");
    expect(cachedWalletAuth(A)).toBeNull();
  });
  it("allows retry after cancellation", async () => {
    await expect(requestWalletAuth(A, async () => { throw new Error("Cancelled"); })).rejects.toThrow("Cancelled");
    expect(cachedWalletAuth(A)).toBeNull();
    await requestWalletAuth(A, async () => "0xretry");
    expect(cachedWalletAuth(A)!["X-Wallet-Signature"]).toBe("0xretry");
  });
  it("does not cache a signature when verification takes longer than its lifetime", async () => {
    await expect(requestWalletAuth(A, async () => {
      vi.advanceTimersByTime(4 * 60 * 1000);
      return "0xlate";
    })).rejects.toThrow("expired");
    expect(cachedWalletAuth(A)).toBeNull();
  });
});
