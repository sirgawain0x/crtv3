import { describe, expect, it } from "vitest";
import { showMembershipTabSkeleton } from "./showMembershipTabSkeleton";

describe("showMembershipTabSkeleton", () => {
  it("shows skeleton only on initial load without cached membership", () => {
    expect(showMembershipTabSkeleton(true, false)).toBe(true);
    expect(showMembershipTabSkeleton(true, true)).toBe(false);
    expect(showMembershipTabSkeleton(false, false)).toBe(false);
  });
});
