import { describe, expect, it } from "vitest";
import { formatAccountKitAuthError } from "./format-account-kit-auth-error";

describe("formatAccountKitAuthError", () => {
  it("maps popup blocked errors", () => {
    expect(formatAccountKitAuthError(new Error("Popup blocked"))).toMatch(
      /popup/i,
    );
  });

  it("maps OTP expiry errors", () => {
    expect(formatAccountKitAuthError(new Error("OTP expired"))).toMatch(
      /verification code/i,
    );
  });

  it("passes through short unknown errors", () => {
    expect(formatAccountKitAuthError(new Error("Custom auth failure"))).toBe(
      "Custom auth failure",
    );
  });
});
