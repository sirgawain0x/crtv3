import { describe, expect, it } from "vitest";
import {
  isAwaitingSmartAccountAddress,
  resolveCreatorWalletAddress,
} from "./creator-wallet-address";

describe("resolveCreatorWalletAddress", () => {
  it("uses smart account when present", () => {
    expect(
      resolveCreatorWalletAddress({
        smartAccountAddress: "0xSca000000000000000000000000000000000001",
        user: {
          address: "0xEoa00000000000000000000000000000000000001",
          type: "sca",
        },
      }),
    ).toBe("0xSca000000000000000000000000000000000001");
  });

  it("does not fall back to EOA while user is null (SCA still loading)", () => {
    expect(
      resolveCreatorWalletAddress({
        smartAccountAddress: null,
        user: null,
      }),
    ).toBeNull();
  });

  it("does not fall back to EOA for sca user without smart account yet", () => {
    expect(
      resolveCreatorWalletAddress({
        smartAccountAddress: null,
        user: {
          address: "0xEoa00000000000000000000000000000000000001",
          type: "sca",
        },
      }),
    ).toBeNull();
  });

  it("uses EOA for confirmed pure-EOA users", () => {
    expect(
      resolveCreatorWalletAddress({
        smartAccountAddress: null,
        user: {
          address: "0xEoa00000000000000000000000000000000000001",
          type: "eoa",
        },
      }),
    ).toBe("0xEoa00000000000000000000000000000000000001");
  });
});

describe("isAwaitingSmartAccountAddress", () => {
  it("waits when authenticated but useUser is still null", () => {
    expect(
      isAwaitingSmartAccountAddress({
        authenticated: true,
        user: null,
        smartAccountAddress: null,
      }),
    ).toBe(true);
  });

  it("does not wait for pure EOA with address", () => {
    expect(
      isAwaitingSmartAccountAddress({
        authenticated: true,
        user: {
          address: "0xEoa00000000000000000000000000000000000001",
          type: "eoa",
        },
        smartAccountAddress: null,
      }),
    ).toBe(false);
  });
});
