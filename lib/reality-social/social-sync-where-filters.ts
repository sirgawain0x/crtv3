export type WhereFilter = Record<string, unknown>;

/** Where clauses for social-sync subgraph queries (Graph Node: no `or` beside column keys at same level). */
export function buildSocialSyncWhereFilters(afterTimestamp: number): {
  newQuestions: WhereFilter;
  answeredQuestions: WhereFilter;
} {
  const ts = Math.max(0, afterTimestamp);

  return {
    newQuestions: {
      created_gt: ts,
      last_bond: "0",
      finalize_ts: null,
    },
    answeredQuestions: {
      or: [
        { last_bond_ts_gt: ts, last_bond_gt: "0" },
        { last_bond_ts_gt: ts, finalize_ts_not: null },
      ],
    },
  };
}

const LOGICAL_KEYS = new Set(["and"]);

export function assertNoOrMixedWithColumns(
  where: WhereFilter,
  path = "where",
): void {
  const keys = Object.keys(where);
  const hasOr = Object.prototype.hasOwnProperty.call(where, "or");
  const columnKeys = keys.filter((k) => k !== "or" && !LOGICAL_KEYS.has(k));

  if (hasOr && columnKeys.length > 0) {
    throw new Error(
      `${path}: cannot mix \`or\` with column filters (${columnKeys.join(", ")})`,
    );
  }

  const branches = where.or;
  if (Array.isArray(branches)) {
    for (let i = 0; i < branches.length; i += 1) {
      const branch = branches[i];
      if (branch && typeof branch === "object") {
        assertNoOrMixedWithColumns(branch as WhereFilter, `${path}.or[${i}]`);
      }
    }
  }

  const andBranches = where.and;
  if (Array.isArray(andBranches)) {
    for (let i = 0; i < andBranches.length; i += 1) {
      const branch = andBranches[i];
      if (branch && typeof branch === "object") {
        assertNoOrMixedWithColumns(branch as WhereFilter, `${path}.and[${i}]`);
      }
    }
  }
}
