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

/** Inner text of the first `where: { ... }` block (brace-balanced). */
export function extractGraphQlWhereInner(document: string): string {
  const whereLabel = document.indexOf("where:");
  if (whereLabel === -1) {
    throw new Error("GraphQL document has no where: clause");
  }
  let braceStart = document.indexOf("{", whereLabel);
  if (braceStart === -1) {
    throw new Error("GraphQL where: is not followed by {");
  }

  let depth = 0;
  for (let i = braceStart; i < document.length; i += 1) {
    const char = document[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return document.slice(braceStart + 1, i);
      }
    }
  }
  throw new Error("GraphQL where: block is not closed");
}

/** Top-level filter keys in a where `{ ... }` body before the first `or:` at depth 0. */
export function topLevelWhereKeysBeforeOr(whereInner: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;

  while (i < whereInner.length) {
    const char = whereInner[i];
    if (char === "{" || char === "[") {
      depth += 1;
      i += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth !== 0) {
      i += 1;
      continue;
    }

    const rest = whereInner.slice(i);
    if (/^\s*or\s*:/.test(rest)) {
      break;
    }

    const keyMatch = rest.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
      i += keyMatch[0].length;
      continue;
    }

    i += 1;
  }

  return keys;
}

function hasTopLevelOrClause(whereInner: string): boolean {
  let depth = 0;
  let i = 0;

  while (i < whereInner.length) {
    const char = whereInner[i];
    if (char === "{" || char === "[") {
      depth += 1;
      i += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 0 && /^\s*or\s*:/.test(whereInner.slice(i))) {
      return true;
    }
    i += 1;
  }

  return false;
}

/**
 * Graph Node rejects column filters beside `or` at the same where level.
 * Assert on the subgraph GraphQL document (not just the JS filter object).
 */
export function assertGraphQlQuestionsWhereNoOrColumnMix(
  document: string,
  label = "GraphQL document",
): void {
  const whereInner = extractGraphQlWhereInner(document);
  const keysBeforeOr = topLevelWhereKeysBeforeOr(whereInner);
  const hasTopLevelOr = hasTopLevelOrClause(whereInner);

  if (hasTopLevelOr && keysBeforeOr.length > 0) {
    throw new Error(
      `${label}: top-level where mixes \`or\` with column filters (${keysBeforeOr.join(", ")})`,
    );
  }
}
