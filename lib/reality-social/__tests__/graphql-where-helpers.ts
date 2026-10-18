/** Test-only helpers for parsing social-sync GraphQL where clauses. */

const TOP_LEVEL_LOGICAL_KEYS = new Set(["or", "and"]);

function skipGraphQlString(source: string, start: number): number {
  if (source[start] !== '"') {
    return start + 1;
  }
  if (source.slice(start, start + 3) === '"""') {
    let i = start + 3;
    while (i < source.length) {
      if (source.slice(i, i + 3) === '"""') {
        return i + 3;
      }
      i += 1;
    }
    return source.length;
  }

  let i = start + 1;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === '"') {
      return i + 1;
    }
    i += 1;
  }
  return source.length;
}

export function extractGraphQlWhereInner(document: string): string {
  const whereLabel = document.indexOf("where:");
  if (whereLabel === -1) {
    throw new Error("GraphQL document has no where: clause");
  }
  const braceStart = document.indexOf("{", whereLabel);
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

/** Every field name at depth 0 in a where `{ ... }` body (order preserved). */
export function topLevelWhereKeys(whereInner: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;

  while (i < whereInner.length) {
    if (whereInner[i] === '"') {
      i = skipGraphQlString(whereInner, i);
      continue;
    }

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

    const keyMatch = whereInner.slice(i).match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
      i += keyMatch[0].length;
      continue;
    }

    i += 1;
  }

  return keys;
}

export function topLevelWhereColumnKeys(whereInner: string): string[] {
  return topLevelWhereKeys(whereInner).filter(
    (key) => !TOP_LEVEL_LOGICAL_KEYS.has(key),
  );
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
  const keys = topLevelWhereKeys(whereInner);
  const hasOr = keys.includes("or");
  const columnKeys = topLevelWhereColumnKeys(whereInner);

  if (hasOr && columnKeys.length > 0) {
    throw new Error(
      `${label}: top-level where mixes \`or\` with column filters (${columnKeys.join(", ")})`,
    );
  }
}
