import { describe, expect, it } from "vitest";
import { hasWalletInitTimedOut, WALLET_INIT_TIMEOUT_MS } from "./wallet-init-timeout";

describe("hasWalletInitTimedOut", () => {
  it("returns false when loading has not started", () => {
    expect(hasWalletInitTimedOut(null, 1000)).toBe(false);
  });

  it("returns true after the timeout window", () => {
    const start = 1000;
    expect(
      hasWalletInitTimedOut(start, start + WALLET_INIT_TIMEOUT_MS),
    ).toBe(true);
  });
});
