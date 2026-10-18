import { describe, expect, it } from "vitest";
import { buildSocialSyncQuestionQueries } from "@/lib/reality-social/reality-social-subgraph-queries";
import {
  assertGraphQlQuestionsWhereNoOrColumnMix,
  assertNoOrMixedWithColumns,
  buildSocialSyncWhereFilters,
  extractGraphQlWhereInner,
  topLevelWhereKeysBeforeOr,
} from "@/lib/reality-social/social-sync-where-filters";

describe("social-sync where filters", () => {
  it("does not mix or with column keys at any level (filter objects)", () => {
    const afterTimestamp = 1_700_000_000;
    const { newQuestions, answeredQuestions } =
      buildSocialSyncWhereFilters(afterTimestamp);

    expect(() => assertNoOrMixedWithColumns(newQuestions, "newQuestions")).not.toThrow();
    expect(() =>
      assertNoOrMixedWithColumns(answeredQuestions, "answeredQuestions"),
    ).not.toThrow();
  });

  it("answered subgraph query has no top-level last_bond_ts_gt beside or", () => {
    const afterTimestamp = 1_700_000_000;
    const { answeredQuestionsQuery } =
      buildSocialSyncQuestionQueries(afterTimestamp);

    expect(() =>
      assertGraphQlQuestionsWhereNoOrColumnMix(
        answeredQuestionsQuery,
        "answeredQuestionsQuery",
      ),
    ).not.toThrow();

    const whereInner = extractGraphQlWhereInner(answeredQuestionsQuery);
    expect(topLevelWhereKeysBeforeOr(whereInner)).toEqual([]);
    expect(whereInner).toMatch(/^\s*or\s*:\s*\[/);
    expect(whereInner).toMatch(/last_bond_ts_gt:\s*1700000000/);
  });

  it("rejects the pre-#375 mixed answered where GraphQL shape", () => {
    const brokenAnsweredQuery = `
    {
      questions(
        orderBy: last_bond_ts
        orderDirection: asc
        first: 100
        where: {
          last_bond_ts_gt: 1700000000,
          or: [{ last_bond_gt: "0" }, { finalize_ts_not: null }]
        }
      ) {
        id
      }
    }
  `;

    expect(() =>
      assertGraphQlQuestionsWhereNoOrColumnMix(
        brokenAnsweredQuery,
        "brokenAnsweredQuery",
      ),
    ).toThrow(/top-level where mixes `or` with column filters \(last_bond_ts_gt\)/);
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
