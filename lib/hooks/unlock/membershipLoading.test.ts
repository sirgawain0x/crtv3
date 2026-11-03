import { describe, expect, it } from "vitest";
import { WALLET_INIT_TIMEOUT_CODE } from "@/lib/hooks/unlock/membership-wallet-wait";
import { computeIsMembershipLoading } from "./membershipLoading";

describe("computeIsMembershipLoading", () => {
  it("is false when verification failed with an error", () => {
    expect(
      computeIsMembershipLoading({
        isLoading: false,
        isVerified: false,
        hasUser: true,
        error: { message: "unlock failed", code: "ERR" },
      }),
    ).toBe(false);
  });

  it("is false when wallet init timed out", () => {
    expect(
      computeIsMembershipLoading({
        isLoading: false,
        isVerified: false,
        hasUser: true,
        error: {
          message: "Smart wallet did not finish loading. Try again.",
          code: WALLET_INIT_TIMEOUT_CODE,
        },
      }),
    ).toBe(false);
  });

  it("is false when there is no wallet address", () => {
    expect(
      computeIsMembershipLoading({
        isLoading: false,
        isVerified: false,
        hasUser: true,
        error: { message: "Wallet address unavailable", code: "NO_VALID_ADDRESS" },
      }),
    ).toBe(false);
  });

  it("is true while verification is in flight", () => {
    expect(
      computeIsMembershipLoading({
        isLoading: true,
        isVerified: false,
        hasUser: true,
        error: null,
      }),
    ).toBe(true);
  });
});
