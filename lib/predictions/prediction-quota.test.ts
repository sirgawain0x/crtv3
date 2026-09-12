import { describe, expect, it } from "vitest";
import { LOCK_ADDRESSES } from "@/lib/sdk/unlock/services";
import {
  getPremiumPredictionAccess,
  UNLIMITED_PREDICTION_LOCK_ADDRESSES,
} from "./prediction-quota";

function membership(address: string, isValid = true) {
  return { address, isValid };
}

describe("getPremiumPredictionAccess", () => {
  it("returns brand tier for Creative Brand Pass", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_PASS_3),
    ]);
    expect(result).toEqual({ unlimited: true, tier: "brand" });
  });

  it("returns brand tier for Creative Brand Plus", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_BRAND_PLUS),
    ]);
    expect(result).toEqual({ unlimited: true, tier: "brand" });
  });

  it("returns investor tier for Creative Investor Pass", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_PASS_2),
    ]);
    expect(result).toEqual({ unlimited: true, tier: "investor" });
  });

  it("returns investor tier for Creative Investor Plus", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_INVESTOR_PLUS),
    ]);
    expect(result).toEqual({ unlimited: true, tier: "investor" });
  });

  it("does not grant unlimited access for Creator pass", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_PASS),
    ]);
    expect(result).toEqual({ unlimited: false, tier: null });
  });

  it("does not grant unlimited access for Creator Plus", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_CREATOR_PLUS),
    ]);
    expect(result).toEqual({ unlimited: false, tier: null });
  });

  it("returns no access when there are no valid memberships", () => {
    const result = getPremiumPredictionAccess([]);
    expect(result).toEqual({ unlimited: false, tier: null });
  });

  it("ignores invalid memberships", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_PASS_3, false),
    ]);
    expect(result).toEqual({ unlimited: false, tier: null });
  });

  it("prefers brand over investor when both are present", () => {
    const result = getPremiumPredictionAccess([
      membership(LOCK_ADDRESSES.BASE_CREATIVE_PASS_2),
      membership(LOCK_ADDRESSES.BASE_CREATIVE_PASS_3),
    ]);
    expect(result).toEqual({ unlimited: true, tier: "brand" });
  });
});

describe("UNLIMITED_PREDICTION_LOCK_ADDRESSES", () => {
  it("includes investor and brand locks only", () => {
    expect(UNLIMITED_PREDICTION_LOCK_ADDRESSES.has(
      LOCK_ADDRESSES.BASE_CREATIVE_PASS_2.toLowerCase()
    )).toBe(true);
    expect(UNLIMITED_PREDICTION_LOCK_ADDRESSES.has(
      LOCK_ADDRESSES.BASE_CREATIVE_INVESTOR_PLUS.toLowerCase()
    )).toBe(true);
    expect(UNLIMITED_PREDICTION_LOCK_ADDRESSES.has(
      LOCK_ADDRESSES.BASE_CREATIVE_PASS_3.toLowerCase()
    )).toBe(true);
    expect(UNLIMITED_PREDICTION_LOCK_ADDRESSES.has(
      LOCK_ADDRESSES.BASE_CREATIVE_BRAND_PLUS.toLowerCase()
    )).toBe(true);
    expect(UNLIMITED_PREDICTION_LOCK_ADDRESSES.has(
      LOCK_ADDRESSES.BASE_CREATIVE_PASS.toLowerCase()
    )).toBe(false);
    expect(UNLIMITED_PREDICTION_LOCK_ADDRESSES.has(
      LOCK_ADDRESSES.BASE_CREATIVE_CREATOR_PLUS.toLowerCase()
    )).toBe(false);
  });
});
