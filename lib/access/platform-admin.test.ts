import { describe, expect, it } from "vitest";
import {
  PLATFORM_ADMIN_ADDRESS,
  resolvePlatformAdminAuthAddress,
} from "@/lib/access/platform-admin";

const ADMIN = PLATFORM_ADMIN_ADDRESS.toLowerCase();
const OTHER_SMART = "0x2222222222222222222222222222222222222222";
const OTHER_EOA = "0x3333333333333333333333333333333333333333";

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
});
