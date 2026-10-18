import { describe, expect, it } from "vitest";
import { buildSocialSyncQuestionQueries } from "@/lib/reality-social/reality-social-subgraph-queries";
import {
  assertNoOrMixedWithColumns,
  buildSocialSyncWhereFilters,
} from "@/lib/reality-social/social-sync-where-filters";

describe("social-sync where filters", () => {
  it("does not mix or with column keys at any level", () => {
    const afterTimestamp = 1_700_000_000;
    const { newQuestions, answeredQuestions } =
      buildSocialSyncWhereFilters(afterTimestamp);

    expect(() => assertNoOrMixedWithColumns(newQuestions, "newQuestions")).not.toThrow();
    expect(() =>
      assertNoOrMixedWithColumns(answeredQuestions, "answeredQuestions"),
    ).not.toThrow();

    const { newQuestionsQuery, answeredQuestionsQuery } =
      buildSocialSyncQuestionQueries(afterTimestamp);

    expect(newQuestionsQuery).not.toMatch(/last_bond_ts_gt:[^}]+or:/);
    expect(answeredQuestionsQuery).toMatch(/or:\s*\[/);
    expect(answeredQuestionsQuery).toMatch(
      /last_bond_ts_gt:\s*1700000000[\s\S]*last_bond_gt:\s*"0"/,
    );
    expect(answeredQuestionsQuery).toMatch(
      /last_bond_ts_gt:\s*1700000000[\s\S]*finalize_ts_not:\s*null/,
    );
  });

  it("rejects invalid where objects that mix or with columns", () => {
    expect(() =>
      assertNoOrMixedWithColumns({
        last_bond_ts_gt: 1,
        or: [{ last_bond_gt: "0" }],
      }),
    ).toThrow(/cannot mix `or` with column filters/);
  });
});
