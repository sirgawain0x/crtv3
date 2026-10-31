import { describe, expect, it } from "vitest";
import { computePlatformAdminIsLoading } from "@/lib/hooks/admin/platform-admin-loading";
import { PLATFORM_ADMIN_ADDRESS } from "@/lib/access/platform-admin";

const OTHER = "0x2222222222222222222222222222222222222222";

describe("computePlatformAdminIsLoading", () => {
  it("stays loading while the smart account client initializes", () => {
    expect(
      computePlatformAdminIsLoading(null, OTHER, true, true),
    ).toBe(true);
  });

  it("is not loading once admin auth address is known", () => {
    expect(
      computePlatformAdminIsLoading(
        PLATFORM_ADMIN_ADDRESS.toLowerCase(),
        OTHER,
        true,
        true,
      ),
    ).toBe(false);
  });

  it("is not loading for EOA platform admin before SCA finishes", () => {
    expect(
      computePlatformAdminIsLoading(null, PLATFORM_ADMIN_ADDRESS, true, true),
    ).toBe(false);
  });
});
