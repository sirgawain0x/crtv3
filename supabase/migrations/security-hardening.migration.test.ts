import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(__dirname);
const ROLLBACKS_DIR = path.join(MIGRATIONS_DIR, "../rollbacks");

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

function assertAtMostOneCreatePolicyPerTable(sql: string): void {
  const policyRegex =
    /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi;
  const counts = new Map<string, number>();
  let match: RegExpExecArray | null;
  while ((match = policyRegex.exec(sql)) !== null) {
    const key = `${match[2].toLowerCase()}::${match[1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) {
    expect(count, `duplicate CREATE POLICY ${key}`).toBeLessThanOrEqual(1);
  }
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

  it("rollback file restores #3 metoken policies and DML grants (not commented)", () => {
    const rollbackFiles = readdirSync(ROLLBACKS_DIR)
      .filter((name) => /^\d+_security_hardening_rollback\.sql$/.test(name))
      .sort();
    expect(rollbackFiles.length).toBe(1);
    const rollbackSql = readFileSync(
      path.join(ROLLBACKS_DIR, rollbackFiles[0]),
      "utf8",
    );
    expect(rollbackSql).toMatch(
      /^\s*GRANT INSERT, UPDATE, DELETE ON TABLE public\.metokens, public\.metoken_balances, public\.metoken_transactions TO authenticated;/m,
    );
    expect(rollbackSql).toMatch(
      /^\s*CREATE POLICY "Users can insert their own metokens" ON public\.metokens AS PERMISSIVE FOR INSERT TO authenticated/m,
    );
    expect(rollbackSql).not.toMatch(
      /^\s*--\s*CREATE POLICY "Users can insert their own balances"/m,
    );
    assertAtMostOneCreatePolicyPerTable(rollbackSql);
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