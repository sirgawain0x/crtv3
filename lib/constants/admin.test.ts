import { describe, expect, it } from "vitest";
import {
  VIDEO_ADMIN_ADDRESS,
  isVideoAdminAddress,
} from "@/lib/constants/admin";

const OLD_VIDEO_ADMIN = "0x2953B96F9160955f6256c9D444F8F7950E6647Df";

describe("VIDEO_ADMIN_ADDRESS", () => {
  it("is the new video admin wallet", () => {
    expect(VIDEO_ADMIN_ADDRESS).toBe(
      "0xdE4b0371BBa20602685916ceeE5B22025a811734",
    );
  });

  it("treats the new address as video admin (case-insensitive)", () => {
    expect(isVideoAdminAddress(VIDEO_ADMIN_ADDRESS)).toBe(true);
    expect(
      isVideoAdminAddress("0xde4b0371bba20602685916ceee5b22025a811734"),
    ).toBe(true);
  });

  it("does not treat the former video admin address as video admin", () => {
    expect(isVideoAdminAddress(OLD_VIDEO_ADMIN)).toBe(false);
    expect(
      isVideoAdminAddress("0x2953b96f9160955f6256c9d444f8f7950e6647df"),
    ).toBe(false);
  });
});
