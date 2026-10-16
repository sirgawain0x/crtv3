import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildClientSchema, parse, validate } from "graphql";
import { buildSocialSyncQuestionQueries } from "@/lib/reality-social/reality-social-subgraph-queries";

const introspection = JSON.parse(
  readFileSync(
    join(__dirname, "fixtures/creative-platform-introspection.json"),
    "utf8",
  ),
);

const schema = buildClientSchema(introspection);

describe("reality social subgraph queries", () => {
  it("validate against creative-platform Question schema fixture", () => {
    const { newQuestionsQuery, answeredQuestionsQuery } =
      buildSocialSyncQuestionQueries(1_700_000_000);

    for (const document of [newQuestionsQuery, answeredQuestionsQuery]) {
      const errors = validate(schema, parse(document));
      expect(errors.map((e) => e.message)).toEqual([]);
    }
  });
});
