import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_PROFILE_PUBLIC_COLUMNS } from "@/lib/sdk/supabase/creator-profiles-select";

const MIGRATIONS_DIR = path.join(__dirname);
const REPO_ROOT = path.join(MIGRATIONS_DIR, "../..");
const BOOTSTRAP_CREATE = path.join(
  REPO_ROOT,
  "scripts/setup-creator-profiles-table.sql",
);

const EXCLUDED_COLUMNS = new Set([
  "twin_pinata_gateway_token",
  "twin_pinata_base_url",
  "twin_pinata_ws_url",
]);

const CREATOR_PROFILE_PUBLIC_COLUMNS_PR447 = [
  "id",
  "owner_address",
  "username",
  "bio",
  "avatar_url",
  "twin_enabled",
  "twin_address",
  "twin_avatar_glb_url",
  "twin_chat_endpoint",
  "twin_pinata_agent_id",
  "twin_pinata_snapshot_cid",
  "twin_pinata_agent_name",
  "twin_pinata_connected_at",
  "orb_account_id",
  "lens_account_id",
  "lens_handle",
  "lens_avatar_uri",
  "brand_channel_slug",
  "social_orb_url",
  "social_instagram_url",
  "social_x_url",
  "social_xmerch",
  "created_at",
  "updated_at",
] as const;

const CREATOR_PROFILES_SCHEMA_HINT =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?creator_profiles|alter\s+table\s+(?:public\.)?creator_profiles/i;

function findMigrationByGlob(pattern: RegExp): string {
  const matches = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && pattern.test(name))
    .sort();
  expect(matches.length).toBe(1);
  return matches[0];
}

function listCreatorProfilesSchemaFiles(): string[] {
  const fromMigrations = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
      return CREATOR_PROFILES_SCHEMA_HINT.test(sql);
    });

  const files = [...fromMigrations];
  if (!fromMigrations.some((f) => /create\s+table/i.test(readFileSync(path.join(MIGRATIONS_DIR, f), "utf8")))) {
    files.push(path.relative(REPO_ROOT, BOOTSTRAP_CREATE));
  }
  return files.sort();
}

function parseCreatorProfilesColumns(files: string[]): Set<string> {
  const columns = new Set<string>();

  for (const file of files) {
    const abs = file.startsWith("scripts/")
      ? path.join(REPO_ROOT, file)
      : path.join(MIGRATIONS_DIR, file);
    const sql = readFileSync(abs, "utf8");

    const createMatch = sql.match(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?creator_profiles\s*\(([\s\S]*?)\);/i,
    );
    if (createMatch) {
      for (const line of createMatch[1].split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("--")) continue;
        const col = trimmed.match(/^([a-z_][a-z0-9_]*)\s+/i)?.[1];
        if (col) columns.add(col.toLowerCase());
      }
    }

    const alterRegex =
      /alter\s+table\s+(?:public\.)?creator_profiles\s+([^;]+);/gi;
    let alterMatch: RegExpExecArray | null;
    while ((alterMatch = alterRegex.exec(sql)) !== null) {
      const clause = alterMatch[1];
      const addRegex =
        /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;
      let addMatch: RegExpExecArray | null;
      while ((addMatch = addRegex.exec(clause)) !== null) {
        columns.add(addMatch[1].toLowerCase());
      }
      const dropRegex = /drop\s+column\s+(?:if\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;
      while ((addMatch = dropRegex.exec(clause)) !== null) {
        columns.delete(addMatch[1].toLowerCase());
      }
      const renameRegex =
        /rename\s+column\s+([a-z_][a-z0-9_]*)\s+to\s+([a-z_][a-z0-9_]*)/gi;
      while ((addMatch = renameRegex.exec(clause)) !== null) {
        columns.delete(addMatch[1].toLowerCase());
        columns.add(addMatch[2].toLowerCase());
      }
    }
  }

  return columns;
}

function parseGrantSelectColumns(migrationSql: string): string[] {
  const grantMatch = migrationSql.match(
    /GRANT\s+SELECT\s*\(([\s\S]*?)\)\s+ON\s+TABLE\s+public\.creator_profiles/i,
  );
  expect(grantMatch, "GRANT SELECT (...) ON TABLE public.creator_profiles").toBeTruthy();
  const inner = grantMatch![1];
  return inner
    .split(",")
    .map((part) => part.replace(/--.*$/gm, "").trim())
    .filter(Boolean)
    .map((name) => name.toLowerCase());
}

describe("creator_profiles column lock migration", () => {
  const fileName = findMigrationByGlob(/^\d+_creator_profiles_column_lock\.sql$/);
  const migrationSql = readFileSync(path.join(MIGRATIONS_DIR, fileName), "utf8");
  const schemaFiles = listCreatorProfilesSchemaFiles();
  const derivedColumns = parseCreatorProfilesColumns(schemaFiles);
  const grantColumns = parseGrantSelectColumns(migrationSql);
  const grantSet = new Set(grantColumns);

  it("documents live apply record and livepeer_notifications_enabled omission in the header", () => {
    expect(migrationSql).toMatch(
      /Applied live to creative-tv on 2026-11-17 at 10:03 PM ET \(version 20261118030259\)/,
    );
    expect(migrationSql).toMatch(/after #449 \(#447 hotfix\) reached prod/);
    expect(migrationSql).toMatch(/livepeer_notifications_enabled is intentionally omitted/i);
  });

  it("excludes livepeer_notifications_enabled from CREATOR_PROFILE_PUBLIC_COLUMNS and migration B GRANT", () => {
    expect(CREATOR_PROFILE_PUBLIC_COLUMNS).not.toContain(
      "livepeer_notifications_enabled",
    );
    expect(grantSet.has("livepeer_notifications_enabled")).toBe(false);
  });

  it("excludes twin_pinata secret columns from GRANT SELECT", () => {
    for (const col of EXCLUDED_COLUMNS) {
      expect(grantSet.has(col)).toBe(false);
    }
  });

  it("includes twin_chat_endpoint in GRANT SELECT", () => {
    expect(grantSet.has("twin_chat_endpoint")).toBe(true);
  });

  it("grants every creator_profiles column from migrations except the three twin_pinata secrets", () => {
    const expected = new Set(derivedColumns);
    for (const col of EXCLUDED_COLUMNS) {
      expected.delete(col);
    }
    expect(grantSet).toEqual(expected);
  });

  it("matches PR #447 CREATOR_PROFILE_PUBLIC_COLUMNS (cross-check)", () => {
    const pr447 = new Set(CREATOR_PROFILE_PUBLIC_COLUMNS_PR447);
    const derivedExpected = new Set(derivedColumns);
    for (const col of EXCLUDED_COLUMNS) {
      derivedExpected.delete(col);
    }
    expect(pr447).toEqual(derivedExpected);
    expect(grantSet).toEqual(pr447);
  });
});