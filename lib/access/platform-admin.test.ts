import { describe, expect, it } from "vitest";
import {
  PLATFORM_ADMIN_ADDRESS,
  isPlatformAdmin,
  resolvePlatformAdminAuthAddress,
} from "@/lib/access/platform-admin";

const OLD_PLATFORM_ADMIN = "0x2953B96F9160955f6256c9D444F8F7950E6647Df";
const ADMIN = PLATFORM_ADMIN_ADDRESS.toLowerCase();
const OTHER_SMART = "0x2222222222222222222222222222222222222222";
const OTHER_EOA = "0x3333333333333333333333333333333333333333";

describe("platform-admin", () => {
  it("exports the new platform admin address", () => {
    expect(PLATFORM_ADMIN_ADDRESS).toBe(
      "0xdE4b0371BBa20602685916ceeE5B22025a811734",
    );
  });

  it("treats the new address as admin (case-insensitive)", () => {
    expect(isPlatformAdmin(PLATFORM_ADMIN_ADDRESS)).toBe(true);
    expect(
      isPlatformAdmin("0xde4b0371bba20602685916ceee5b22025a811734"),
    ).toBe(true);
  });

  it("does not treat the previous admin address as admin", () => {
    expect(isPlatformAdmin(OLD_PLATFORM_ADMIN)).toBe(false);
    expect(
      isPlatformAdmin("0x2953b96f9160955f6256c9d444f8f7950e6647df"),
    ).toBe(false);
  });

  it("returns false for invalid or missing addresses", () => {
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
    expect(isPlatformAdmin("not-an-address")).toBe(false);
  });
});

describe("resolvePlatformAdminAuthAddress", () => {
  it("prefers smart account when it is platform admin", () => {
    expect(
      resolvePlatformAdminAuthAddress(PLATFORM_ADMIN_ADDRESS, OTHER_EOA),
    ).toBe(ADMIN);
  });

  it("falls back to EOA when only EOA is platform admin", () => {
    expect(
      resolvePlatformAdminAuthAddress(OTHER_SMART, PLATFORM_ADMIN_ADDRESS),
    ).toBe(ADMIN);
  });

  it("returns null when neither address is platform admin", () => {
    expect(resolvePlatformAdminAuthAddress(OTHER_SMART, OTHER_EOA)).toBeNull();
  });

  it("matches isPlatformAdmin for the resolved signing address", () => {
    const resolved = resolvePlatformAdminAuthAddress(
      OTHER_SMART,
      PLATFORM_ADMIN_ADDRESS,
    );
    expect(resolved).not.toBeNull();
    expect(isPlatformAdmin(resolved)).toBe(true);
  });
});
