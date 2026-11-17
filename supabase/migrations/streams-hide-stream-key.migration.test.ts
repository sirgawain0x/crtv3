import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(__dirname);
const TARGET_MIGRATION = "20261117234351_streams_hide_stream_key.sql";

const APPLIED_VERBATIM_STATEMENTS = [
  "REVOKE SELECT ON public.streams FROM anon, authenticated;",
  "GRANT SELECT (id, creator_id, stream_id, playback_id, thumbnail_url, name, is_live, last_live_at, created_at, updated_at, allow_clipping, story_ip_id, story_license_terms_id, story_ip_registration_tx, story_ip_registered_at, story_commercial_rev_share, requires_metoken, metoken_price, lens_live_post_id, save_recording) ON public.streams TO anon, authenticated;",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.streams FROM anon;",
  'DROP POLICY IF EXISTS "Creators can view their own stream key" ON public.streams;',
] as const;

const STREAMS_SCHEMA_MIGRATION_HINT =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.streams|alter\s+table\s+public\.streams/i;

function listStreamsSchemaMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && name !== TARGET_MIGRATION)
    .filter((name) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
      return STREAMS_SCHEMA_MIGRATION_HINT.test(sql);
    })
    .sort();
}

function parseStreamsColumnsFromMigrations(files: string[]): Set<string> {
  const columns = new Set<string>();

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    const createMatch = sql.match(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.streams\s*\(([\s\S]*?)\);/i,
    );
    if (createMatch) {
      const body = createMatch[1];
      for (const line of body.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("--")) continue;
        const col = trimmed.match(/^([a-z_][a-z0-9_]*)\s+/i)?.[1];
        if (col) columns.add(col.toLowerCase());
      }
    }

    const streamsAlterRegex =
      /alter\s+table\s+public\.streams\s+([^;]+);/gi;
    let streamsAlter: RegExpExecArray | null;
    while ((streamsAlter = streamsAlterRegex.exec(sql)) !== null) {
      const clause = streamsAlter[1];
      const addColumnRegex =
        /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;
      let addMatch: RegExpExecArray | null;
      while ((addMatch = addColumnRegex.exec(clause)) !== null) {
        columns.add(addMatch[1].toLowerCase());
      }

      const dropColumnRegex =
        /drop\s+column\s+(?:if\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;
      while ((addMatch = dropColumnRegex.exec(clause)) !== null) {
        columns.delete(addMatch[1].toLowerCase());
      }
    }
  }

  return columns;
}

function parseGrantSelectColumns(migrationSql: string): string[] {
  const grantMatch = migrationSql.match(
    /GRANT\s+SELECT\s*\(([\s\S]*?)\)\s+ON\s+public\.streams/i,
  );
  expect(grantMatch, "GRANT SELECT (...) ON public.streams").toBeTruthy();
  const inner = grantMatch![1];
  return inner
    .split(",")
    .map((part) => part.replace(/--.*$/gm, "").trim())
    .filter(Boolean)
    .map((name) => name.toLowerCase());
}

describe("20261117234351_streams_hide_stream_key.sql", () => {
  const migrationSql = readFileSync(
    path.join(MIGRATIONS_DIR, TARGET_MIGRATION),
    "utf8",
  );
  const schemaFiles = listStreamsSchemaMigrationFiles();
  const derivedColumns = parseStreamsColumnsFromMigrations(schemaFiles);
  const grantColumns = parseGrantSelectColumns(migrationSql);
  const grantSet = new Set(grantColumns);

  it("documents column-level grant requirement and production apply record", () => {
    expect(migrationSql).toMatch(/new column on public\.streams/i);
    expect(migrationSql).toMatch(/column-level SELECT grant to anon\/authenticated/i);
    expect(migrationSql).toMatch(/invisible to those roles/i);
    expect(migrationSql).toMatch(
      /Applied to production creative-tv on 2026-11-17 as migration streams_hide_stream_key/i,
    );
  });

  it("matches the four production statements verbatim", () => {
    const lines = migrationSql
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0 && !line.startsWith("--"));
    expect(lines).toEqual([...APPLIED_VERBATIM_STATEMENTS]);
  });

  it("excludes stream_key from GRANT SELECT", () => {
    expect(grantSet.has("stream_key")).toBe(false);
  });

  it("grants every streams column from prior migrations except stream_key", () => {
    const expected = new Set(derivedColumns);
    expected.delete("stream_key");

    expect(grantSet).toEqual(expected);
  });

  it("includes REVOKE SELECT and anon write REVOKEs", () => {
    expect(migrationSql).toMatch(
      /REVOKE\s+SELECT\s+ON\s+public\.streams\s+FROM\s+anon,\s*authenticated/i,
    );
    expect(migrationSql).toMatch(
      /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE,\s*TRUNCATE,\s*TRIGGER\s+ON\s+public\.streams\s+FROM\s+anon/i,
    );
  });

  it("drops the creator stream key visibility policy", () => {
    expect(migrationSql).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"Creators can view their own stream key"\s+ON\s+public\.streams/i,
    );
  });
});