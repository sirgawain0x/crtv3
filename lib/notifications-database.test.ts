import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const a = "0x" + "a".repeat(40);
const b = "0x" + "b".repeat(40);
const c = "0x" + "c".repeat(40);
const db = new PGlite();
const rows = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as Record<string, any>[];
const register = (owner: string, endpoint: string) => rows("SELECT register_push_subscription($1,$2,$3)", [owner, endpoint, { p256dh: "key", auth: "auth" }]);
const notify = (owner: string, key: string) => rows("INSERT INTO notifications(id,owner_id,event_key,title,body,href) VALUES(gen_random_uuid()::text,$1,$2,'Update','Generic','/watch/video') RETURNING id", [owner, key]);
const claim = (owner: string | null = null) => rows("SELECT * FROM claim_push_deliveries($1,20)", [owner]);

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS 'SELECT current_user::text';
    CREATE TABLE video_assets(id serial PRIMARY KEY, creator_id text, playback_id text);
    CREATE TABLE video_comments(id serial PRIMARY KEY, video_asset_id integer REFERENCES video_assets(id),
      parent_comment_id integer REFERENCES video_comments(id), commenter_address text, is_deleted boolean DEFAULT false);
  `);
  for (const file of ["20261102000000_create_notifications.sql", "20261103000000_notification_delivery.sql"]) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
}, 30000);
afterAll(async () => { await db.close(); });

describe.sequential("notification delivery database", () => {
  it("queues future events without replaying historical unread activity", async () => {
    await notify(a, "historical");
    await register(a, "https://fcm.googleapis.com/a");
    expect(await claim(a)).toEqual([]);
    await notify(a, "new");
    const first = await claim(a);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ attempts: 1, endpoint: "https://fcm.googleapis.com/a" });
    expect(await claim(a)).toEqual([]); // overlapping dispatcher cannot claim an active lease
    await rows("UPDATE push_deliveries SET state='sent' WHERE id=$1", [first[0].id]);
  });

  it("cron with no owner claims across owners, and owner-scoped dispatch stays isolated", async () => {
    await register(b, "https://fcm.googleapis.com/b");
    await notify(a, "global-a"); await notify(b, "global-b");
    const scoped = await claim(a);
    expect(scoped.map(x => x.endpoint)).toEqual(["https://fcm.googleapis.com/a"]);
    const global = await claim();
    expect(global.map(x => x.endpoint)).toEqual(["https://fcm.googleapis.com/b"]);
    await rows("UPDATE push_deliveries SET state='sent'");
  });

  it("recovers abandoned claims, increments attempts, and fences stale acknowledgements", async () => {
    await notify(a, "lease");
    const [first] = await claim(a);
    await rows("UPDATE push_deliveries SET locked_at=now()-interval '6 minutes' WHERE id=$1", [first.id]);
    const [second] = await claim(a);
    expect(second.attempts).toBe(2);
    expect(second.claim_token).not.toBe(first.claim_token);
    const stale = await rows("UPDATE push_deliveries SET state='sent' WHERE id=$1 AND claim_token=$2 RETURNING id", [first.id, first.claim_token]);
    expect(stale).toEqual([]);
    await rows("UPDATE push_deliveries SET attempts=5, locked_at=now()-interval '6 minutes' WHERE id=$1", [first.id]);
    expect(await claim(a)).toEqual([]);
    expect((await rows("SELECT state FROM push_deliveries WHERE id=$1", [first.id]))[0].state).toBe("failed");
  });

  it("does not claim retries before their due time", async () => {
    await notify(a, "backoff");
    const [delivery] = await claim(a);
    await rows("UPDATE push_deliveries SET state='pending',next_attempt_at=now()+interval '1 hour' WHERE id=$1", [delivery.id]);
    expect(await claim(a)).toEqual([]);
    await rows("UPDATE push_deliveries SET state='sent' WHERE id=$1", [delivery.id]);
  });

  it("cancels pending deliveries when read or when a device is disabled", async () => {
    const [notification] = await notify(a, "read");
    await rows("UPDATE notifications SET read_at=now() WHERE id=$1", [notification.id]);
    expect(await claim(a)).toEqual([]);
    await notify(a, "disabled");
    await rows("UPDATE push_subscriptions SET enabled=false WHERE owner_id=$1", [a]);
    expect(await claim(a)).toEqual([]);
    await register(a, "https://fcm.googleapis.com/a");
    expect(await claim(a)).toEqual([]); // re-enable does not replay cancelled events
  });

  it("rejects endpoint theft and enforces the five-device limit", async () => {
    await expect(register(b, "https://fcm.googleapis.com/a")).rejects.toThrow("another account");
    for (let i = 0; i < 5; i++) await register(c, `https://fcm.googleapis.com/c${i}`);
    await expect(register(c, "https://fcm.googleapis.com/c5")).rejects.toThrow("Device limit");
    await register(c, "https://fcm.googleapis.com/c0"); // idempotent registration still allowed
  });

  it("turns comments and replies into deduplicated activity for the correct recipients", async () => {
    const [video] = await rows("INSERT INTO video_assets(creator_id,playback_id) VALUES($1,'video') RETURNING id", [a]);
    const [parent] = await rows("INSERT INTO video_comments(video_asset_id,commenter_address) VALUES($1,$2) RETURNING id", [video.id, b]);
    const [reply] = await rows("INSERT INTO video_comments(video_asset_id,parent_comment_id,commenter_address) VALUES($1,$2,$3) RETURNING id", [video.id, parent.id, c]);
    const notifications = await rows("SELECT owner_id,href FROM notifications WHERE event_key=$1 ORDER BY owner_id", [`video-comment:${reply.id}`]);
    expect(notifications).toEqual([{ owner_id: a, href: "/watch/video" }, { owner_id: b, href: "/watch/video" }]);
    await rows("INSERT INTO video_comments(video_asset_id,commenter_address,is_deleted) VALUES($1,$2,true)", [video.id, c]);
    const own = await rows("INSERT INTO video_comments(video_asset_id,commenter_address) VALUES($1,$2) RETURNING id", [video.id, a]);
    expect(await rows("SELECT id FROM notifications WHERE event_key=$1", [`video-comment:${own[0].id}`])).toEqual([]);
  });

  it("denies anonymous and authenticated callers direct access to notification tables and RPCs", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      for (const sql of ["SELECT * FROM notifications", "SELECT * FROM push_subscriptions", "SELECT * FROM push_deliveries", "SELECT * FROM claim_push_deliveries(NULL,20)"]) {
        await expect(db.query(sql)).rejects.toThrow(/permission denied/);
      }
      await db.exec("RESET ROLE");
    }
  });
});
