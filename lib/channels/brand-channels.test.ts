import { describe, expect, it } from "vitest";
import {
  getBrandChannelPath,
  isValidBrandChannelSlug,
  CHONES_CHANNEL_OWNER_ADDRESS,
} from "./brand-channels";

describe("brand-channels", () => {
  it("accepts known slugs", () => {
    expect(isValidBrandChannelSlug("chones")).toBe(true);
    expect(isValidBrandChannelSlug("spindrift")).toBe(true);
    expect(isValidBrandChannelSlug("songchain")).toBe(true);
  });

  it("rejects unknown slugs", () => {
    expect(isValidBrandChannelSlug("fake")).toBe(false);
    expect(isValidBrandChannelSlug(null)).toBe(false);
  });

  it("resolves channel paths", () => {
    expect(getBrandChannelPath("chones")).toBe("/chones");
    expect(getBrandChannelPath("invalid")).toBeNull();
  });

  it("documents Chones owner address", () => {
    expect(CHONES_CHANNEL_OWNER_ADDRESS.toLowerCase()).toMatch(/^0x6ab/);
    expect(CHONES_CHANNEL_OWNER_ADDRESS.toLowerCase()).toMatch(/c5ad$/);
  });
});
