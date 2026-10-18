/** Test-only helpers for parsing social-sync GraphQL where clauses. */

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
