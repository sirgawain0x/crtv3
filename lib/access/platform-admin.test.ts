import { describe, expect, it } from "vitest";
import {
  PLATFORM_ADMIN_ADDRESS,
  isPlatformAdmin,
} from "@/lib/access/platform-admin";

const OLD_PLATFORM_ADMIN = "0x2953B96F9160955f6256c9D444F8F7950E6647Df";

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
