import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATOR_PROFILE_FORBIDDEN_PUBLIC_PINATA_COLUMNS,
  CREATOR_PROFILE_PUBLIC_COLUMNS,
  CREATOR_PROFILE_PUBLIC_SELECT,
  CREATOR_PROFILE_TWIN_ROUTING_SELECT,
  CREATOR_PROFILE_TWIN_STATUS_SELECT,
} from "./creator-profiles-select";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

const SCAN_ROOTS = ["app", "lib", "services"] as const;

const FORBIDDEN_IN_PUBLIC = new Set<string>(
  CREATOR_PROFILE_FORBIDDEN_PUBLIC_PINATA_COLUMNS,
);

const SERVICE_ONLY_SELECTS = new Set([
  CREATOR_PROFILE_TWIN_ROUTING_SELECT,
  CREATOR_PROFILE_TWIN_STATUS_SELECT,
]);

/** Paths allowed to reference forbidden Pinata columns only via service-only select constants or writes (no SELECT leakage). */
const SERVICE_PINATA_PATH_PREFIXES = [
  "app/api/twin/chat/route.ts",
  "app/api/twin/status/route.ts",
  "app/api/twin/connect/route.ts",
  "app/api/twin/disconnect/route.ts",
  "lib/sdk/supabase/creator-profiles-select.ts",
] as const;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

function relativePosix(file: string): string {
  return path.relative(REPO_ROOT, file).split(path.sep).join("/");
}

function extractCreatorProfileSelects(source: string): { index: number; arg: string }[] {
  const hits: { index: number; arg: string }[] = [];
  const fromRe = /\.from\s*\(\s*['"]creator_profiles['"]\s*\)/g;
  let fromMatch: RegExpExecArray | null;
  while ((fromMatch = fromRe.exec(source)) !== null) {
    const slice = source.slice(fromMatch.index, fromMatch.index + 800);
    const selectMatch = slice.match(/\.select\s*\(\s*([^)]*)\)/);
    if (selectMatch) {
      hits.push({ index: fromMatch.index, arg: selectMatch[1].trim() });
    }
  }
  return hits;
}

function isBareSelect(arg: string): boolean {
  return arg.length === 0;
}

function isStarSelect(arg: string): boolean {
  const stripped = arg.replace(/['"`]/g, "").trim();
  return stripped === "*";
}

function referencesForbiddenPinataColumn(arg: string): string | null {
  for (const col of FORBIDDEN_IN_PUBLIC) {
    if (arg.includes(col)) return col;
  }
  return null;
}

function isAllowedServiceSelect(rel: string, arg: string): boolean {
  if (!SERVICE_PINATA_PATH_PREFIXES.some((p) => rel === p || rel.startsWith(p))) {
    return false;
  }
  if (SERVICE_ONLY_SELECTS.has(arg)) return true;
  // connect/disconnect: writes without .select()
  if (isBareSelect(arg)) return false;
  return arg.length === 0;
}

function scanForViolations(): string[] {
  const violations: string[] = [];
  const files = SCAN_ROOTS.flatMap((root) =>
    collectSourceFiles(path.join(REPO_ROOT, root)),
  );

  for (const file of files) {
    const rel = relativePosix(file);
    const source = readFileSync(file, "utf8");
    if (!source.includes("creator_profiles")) continue;

    const selects = extractCreatorProfileSelects(source);
    for (const { arg } of selects) {
      if (isBareSelect(arg)) {
        violations.push(`${rel}: bare .select() on creator_profiles`);
        continue;
      }
      if (isStarSelect(arg)) {
        violations.push(`${rel}: .select('*') on creator_profiles`);
        continue;
      }
      const forbidden = referencesForbiddenPinataColumn(arg);
      if (forbidden && !isAllowedServiceSelect(rel, arg)) {
        violations.push(
          `${rel}: non-service select includes forbidden column ${forbidden}`,
        );
      }
    }
  }
  return violations;
}

describe("creator_profiles public select guard", () => {
  it("public column list excludes Pinata routing secrets", () => {
    for (const col of CREATOR_PROFILE_FORBIDDEN_PUBLIC_PINATA_COLUMNS) {
      expect(CREATOR_PROFILE_PUBLIC_COLUMNS as readonly string[]).not.toContain(
        col,
      );
    }
    expect(CREATOR_PROFILE_PUBLIC_SELECT).not.toMatch(/twin_pinata_gateway_token/);
    expect(CREATOR_PROFILE_PUBLIC_SELECT).not.toMatch(/twin_pinata_base_url/);
    expect(CREATOR_PROFILE_PUBLIC_SELECT).not.toMatch(/twin_pinata_ws_url/);
  });

  it("keeps twin_chat_endpoint for DigitalTwinOverlay", () => {
    expect(CREATOR_PROFILE_PUBLIC_COLUMNS).toContain("twin_chat_endpoint");
  });

  it("static scan: no unsafe creator_profiles selects in app/lib/services", () => {
    const violations = scanForViolations();
    expect(violations).toEqual([]);
  });

  it("static scan catches a seeded violation (not committed)", () => {
    const sample = `
      const supabase = await createClient();
      await supabase.from('creator_profiles').select('*');
    `;
    const hits = extractCreatorProfileSelects(sample);
    expect(hits).toHaveLength(1);
    expect(isStarSelect(hits[0].arg)).toBe(true);
  });
});