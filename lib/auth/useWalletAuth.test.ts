import { describe, expect, it } from "vitest";
import { computeWalletAuthIsReady } from "@/lib/auth/useWalletAuth";

describe("computeWalletAuthIsReady", () => {
  it("is false when the smart account client is still loading", () => {
    expect(
      computeWalletAuthIsReady(undefined, "0x2222222222222222222222222222222222222222"),
    ).toBe(false);
  });

  it("is true only when both client and address exist", () => {
    expect(
      computeWalletAuthIsReady({}, "0x2222222222222222222222222222222222222222"),
    ).toBe(true);
    expect(computeWalletAuthIsReady({}, "")).toBe(false);
  });
});
