import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { renderStreamCutoverSql } from "./stream-cutover";
import type { StreamSnapshot } from "./stream-replacements";
const source: StreamSnapshot = {
  id: "11111111-1111-4111-8111-111111111111",
  creator_id: `0x${"a".repeat(40)}`,
  stream_id: "old-stream",
  playback_id: "old-play",
  is_live: false,
  save_recording: true,
  requires_metoken: true,
  metoken_price: 2,
  updated_at: "2026-11-24T00:00:00Z",
};
const newStream = Buffer.from(`Stream:${source.id}`).toString("base64");
async function fixture() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
 CREATE TABLE streams(id uuid primary key,creator_id text,stream_id text,playback_id text,stream_key text,is_live boolean,save_recording boolean,requires_metoken boolean,metoken_price numeric,updated_at timestamptz,provider text,livepeer_stream_id text,livepeer_playback_id text,frameworks_stream_id text,frameworks_playback_id text,name text);`);
  await db.exec(
    await readFile(
      "supabase/migrations/20261124051337_frameworks_stream_replacements.sql",
      "utf8",
    ),
  );
  await db.query(
    `INSERT INTO streams(id,creator_id,stream_id,playback_id,stream_key,is_live,save_recording,requires_metoken,metoken_price,updated_at,name) VALUES($1,$2,$3,$4,'PRIVATE_OLD_KEY',false,true,true,2,$5,'Original name')`,
    [
      source.id,
      source.creator_id,
      source.stream_id,
      source.playback_id,
      source.updated_at,
    ],
  );
  await db.query(
    `INSERT INTO frameworks_stream_replacements(stream_row_id,source_snapshot,source_provider,source_stream_key,state,frameworks_stream_id,frameworks_playback_id,frameworks_stream_key) VALUES($1,$2,NULL,'PRIVATE_OLD_KEY','ready',$3,'New_Play','PRIVATE_NEW_KEY')`,
    [source.id, JSON.stringify(source), newStream],
  );
  return db;
}
it("atomically cuts over all identities, repeats safely and rolls back keys without overwriting metadata", async () => {
  const db = await fixture();
  try {
    const sql = renderStreamCutoverSql([source], "apply");
    expect(sql).not.toContain("PRIVATE_");
    await db.exec(sql);
    await db.exec(sql);
    expect(
      (
        await db.query(
          "SELECT stream_id,playback_id,stream_key,livepeer_playback_id,provider FROM streams",
        )
      ).rows,
    ).toEqual([
      {
        stream_id: newStream,
        playback_id: "New_Play",
        stream_key: "PRIVATE_NEW_KEY",
        livepeer_playback_id: "old-play",
        provider: "frameworks",
      },
    ]);
    await db.exec("UPDATE streams SET name='New name'");
    await db.exec(renderStreamCutoverSql([source], "rollback"));
    expect(
      (
        await db.query(
          "SELECT stream_id,stream_key,name,requires_metoken FROM streams",
        )
      ).rows,
    ).toEqual([
      {
        stream_id: "old-stream",
        stream_key: "PRIVATE_OLD_KEY",
        name: "New name",
        requires_metoken: true,
      },
    ]);
  } finally {
    await db.close();
  }
}, 30000);
it.each([
  "UPDATE streams SET requires_metoken=false",
  "UPDATE streams SET is_live=true",
  "UPDATE streams SET stream_key='CHANGED'",
  "UPDATE streams SET updated_at=now()",
  "UPDATE frameworks_stream_replacements SET state='ambiguous'",
])(
  "blocks changed source or uncertain targets: %s",
  async (mutation) => {
    const db = await fixture();
    try {
      await db.exec(mutation);
      await expect(
        db.exec(renderStreamCutoverSql([source], "apply")),
      ).rejects.toThrow();
      await db.exec("ROLLBACK");
      expect((await db.query("SELECT stream_id FROM streams")).rows).toEqual([
        { stream_id: "old-stream" },
      ]);
    } finally {
      await db.close();
    }
  },
  30000,
);
it("blocks an unreviewed channel and denies public reads of ingest keys", async () => {
  const db = await fixture();
  try {
    expect(
      (
        await db.query(
          "SELECT has_table_privilege('anon','frameworks_stream_replacements','SELECT') AS allowed,has_table_privilege('service_role','frameworks_stream_replacements','DELETE') AS runtime_delete",
        )
      ).rows,
    ).toEqual([{ allowed: false, runtime_delete: false }]);
    await db.exec(
      "INSERT INTO streams(id) VALUES('22222222-2222-4222-8222-222222222222')",
    );
    await expect(
      db.exec(renderStreamCutoverSql([source], "apply")),
    ).rejects.toThrow("catalog changed");
    await db.exec("ROLLBACK");
  } finally {
    await db.close();
  }
}, 30000);
