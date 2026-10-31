import { describe, expect, it } from "vitest";
import {
  isPlatformAdminWalletAuthReady,
  resolvePlatformAdminSignMode,
} from "@/lib/hooks/admin/platform-admin-wallet-auth";
import { PLATFORM_ADMIN_ADDRESS } from "@/lib/access/platform-admin";

const OTHER = "0x2222222222222222222222222222222222222222";

describe("platform-admin-wallet-auth", () => {
  it("resolves smart-account signing when admin auth is the SCA", () => {
    expect(
      resolvePlatformAdminSignMode(PLATFORM_ADMIN_ADDRESS, PLATFORM_ADMIN_ADDRESS, OTHER),
    ).toBe("smart-account");
    expect(isPlatformAdminWalletAuthReady("smart-account", false)).toBe(false);
    expect(isPlatformAdminWalletAuthReady("smart-account", true)).toBe(true);
  });

  it("resolves EOA signing when admin auth is the EOA only", () => {
    expect(
      resolvePlatformAdminSignMode(PLATFORM_ADMIN_ADDRESS, OTHER, PLATFORM_ADMIN_ADDRESS),
    ).toBe("eoa");
    expect(isPlatformAdminWalletAuthReady("eoa", false)).toBe(true);
  });
});
