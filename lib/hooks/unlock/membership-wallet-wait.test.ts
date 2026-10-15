import { describe, expect, it } from "vitest";
import {
  shouldWaitForMembershipSmartAccount,
  shouldWaitForMembershipWalletInit,
} from "./membership-wallet-wait";

describe("shouldWaitForMembershipSmartAccount", () => {
  it("waits when authenticated and user is null (timeout should still run)", () => {
    expect(
      shouldWaitForMembershipSmartAccount({
        ready: true,
        authenticated: true,
        userType: undefined,
        smartAccountAddress: null,
      }),
    ).toBe(true);
  });

  it("does not wait for pure EOA users", () => {
    expect(
      shouldWaitForMembershipSmartAccount({
        ready: true,
        authenticated: true,
        userType: "eoa",
        smartAccountAddress: null,
      }),
    ).toBe(false);
  });

  it("stops waiting once smart account address is available", () => {
    expect(
      shouldWaitForMembershipSmartAccount({
        ready: true,
        authenticated: true,
        userType: undefined,
        smartAccountAddress: "0xSca000000000000000000000000000000000001",
      }),
    ).toBe(false);
  });
});

describe("shouldWaitForMembershipWalletInit", () => {
  it("waits while Privy is not ready", () => {
    expect(
      shouldWaitForMembershipWalletInit({
        ready: false,
        authenticated: false,
        userType: undefined,
        smartAccountAddress: null,
        userAddress: null,
      }),
    ).toBe(true);
  });

  it("waits for EOA address when type is eoa", () => {
    expect(
      shouldWaitForMembershipWalletInit({
        ready: true,
        authenticated: true,
        userType: "eoa",
        smartAccountAddress: null,
        userAddress: null,
      }),
    ).toBe(true);
  });
});
