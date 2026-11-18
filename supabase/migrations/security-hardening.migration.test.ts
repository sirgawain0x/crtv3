import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(__dirname);

function findMigrationByGlob(pattern: RegExp): string {
  const matches = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && pattern.test(name))
    .sort();
  expect(matches.length).toBe(1);
  return matches[0];
}

function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

describe("security hardening migration", () => {
  const fileName = findMigrationByGlob(/^\d+_security_hardening\.sql$/);
  const migrationSql = readFileSync(path.join(MIGRATIONS_DIR, fileName), "utf8");
  const executable = stripSqlComments(migrationSql);

  it("has no GRANT of write-class privileges TO anon", () => {
    expect(executable).not.toMatch(
      /GRANT\s+[^;]*\b(INSERT|UPDATE|DELETE|TRUNCATE)\b[^;]*\s+TO\s+anon\b/i,
    );
  });

  it("drops authenticated stream write policies and revokes authenticated DML on streams", () => {
    expect(migrationSql).toMatch(
      /DROP POLICY IF EXISTS "Creators can insert their own stream" ON public\.streams;/,
    );
    expect(migrationSql).toMatch(
      /DROP POLICY IF EXISTS "Creators can update their own stream" ON public\.streams;/,
    );
    expect(migrationSql).toMatch(
      /DROP POLICY IF EXISTS "Creators can delete their own stream" ON public\.streams;/,
    );
    expect(migrationSql).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.streams FROM authenticated;/,
    );
  });

  it("has active #3 metoken policy drops and revokes (not commented)", () => {
    expect(migrationSql).toMatch(
      /^\s*DROP POLICY IF EXISTS "Users can insert their own balances" ON public\.metoken_balances;/m,
    );
    expect(migrationSql).toMatch(
      /^\s*DROP POLICY IF EXISTS "Users can update their own metokens" ON public\.metokens;/m,
    );
    expect(migrationSql).not.toMatch(
      /^\s*--\s*DROP POLICY IF EXISTS "Users can insert their own balances"/m,
    );
    expect(migrationSql).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.metokens, public\.metoken_balances, public\.metoken_transactions FROM anon, authenticated;/,
    );
  });
});