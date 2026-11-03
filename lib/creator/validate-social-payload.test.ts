import { describe, expect, it } from "vitest";
import { validateAndNormalizeSocialPayload } from "@/lib/creator/validate-social-payload";

describe("validateAndNormalizeSocialPayload", () => {
  it("normalizes provided social fields", () => {
    const result = validateAndNormalizeSocialPayload({
      social_x_url: "@foo",
      social_instagram_url: "",
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        social_x_url: "https://x.com/foo",
        social_instagram_url: null,
      },
    });
  });

  it("returns field errors for invalid values", () => {
    const result = validateAndNormalizeSocialPayload({
      social_orb_url: "https://orb.club/c/club",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.social_orb_url).toBeTruthy();
    }
  });

  it("ignores omitted fields", () => {
    const result = validateAndNormalizeSocialPayload({});
    expect(result).toEqual({ ok: true, payload: {} });
  });
});
