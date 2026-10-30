import { describe, expect, it } from "vitest";
import {
  CREATOR_PROFILE_SELECT_LEGACY,
  CREATOR_PROFILE_SELECT_WITH_XMERCH,
  fetchCreatorProfileForPage,
  isSocialXmerchColumnMissingError,
} from "@/lib/creator/fetch-creator-profile-for-page";

describe("isSocialXmerchColumnMissingError", () => {
  it("detects missing social_xmerch column errors", () => {
    expect(
      isSocialXmerchColumnMissingError({
        code: "42703",
        message: 'column "social_xmerch" does not exist',
      }),
    ).toBe(true);
    expect(
      isSocialXmerchColumnMissingError({
        code: "PGRST204",
        message: "Could not find the social_xmerch column in the schema cache",
      }),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(
      isSocialXmerchColumnMissingError({
        message: "connection timeout",
      }),
    ).toBe(false);
  });
});

describe("fetchCreatorProfileForPage", () => {
  it("retries with legacy select when social_xmerch column is missing", async () => {
    const calls: string[] = [];
    const supabase = {
      from: () => ({
        select: (columns: string) => {
          calls.push(columns);
          return {
            eq: () => ({
              single: async () => {
                if (columns === CREATOR_PROFILE_SELECT_WITH_XMERCH) {
                  return {
                    data: null,
                    error: {
                      code: "PGRST204",
                      message:
                        "Could not find the social_xmerch column in the schema cache",
                    },
                  };
                }
                if (columns === CREATOR_PROFILE_SELECT_LEGACY) {
                  return {
                    data: { owner_address: "0xabc", username: "creator" },
                    error: null,
                  };
                }
                return { data: null, error: { message: "unexpected" } };
              },
            }),
          };
        },
      }),
    };

    const result = await fetchCreatorProfileForPage(
      supabase as never,
      "0xAbC",
    );

    expect(calls).toEqual([
      CREATOR_PROFILE_SELECT_WITH_XMERCH,
      CREATOR_PROFILE_SELECT_LEGACY,
    ]);
    expect(result.data).toEqual({ owner_address: "0xabc", username: "creator" });
    expect(result.error).toBeNull();
  });
});
