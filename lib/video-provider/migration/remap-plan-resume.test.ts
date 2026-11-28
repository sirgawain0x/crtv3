import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { identityStatePredicates, type RemapPlan } from './remap-plan';

/**
 * The resume check compares a live row against each patch's before/after state. A legacy row carries NULL in
 * frameworks_asset_id / frameworks_playback_id, so a comparison built by string interpolation would produce
 * `frameworks_asset_id = 'null'` and never match. These cases run the real predicates through Postgres semantics.
 */
const plan: RemapPlan = {
  blockers: [],
  unresolvedReferences: [],
  preservedDraftIds: [],
  patches: [
    {
      table: 'video_assets',
      id: 145,
      before: {
        asset_id: '11111111-1111-1111-1111-111111111111',
        playback_id: "legacy'play",
        provider: 'livepeer',
        livepeer_asset_id: '11111111-1111-1111-1111-111111111111',
        livepeer_playback_id: "legacy'play",
        frameworks_asset_id: null as unknown as string,
        frameworks_playback_id: null as unknown as string,
      },
      after: {
        asset_id: 'fw-asset-202611280133060c818dff6b2c412c',
        playback_id: 'jZaV9t7k0yxBZVhm',
        provider: 'frameworks',
        livepeer_asset_id: '11111111-1111-1111-1111-111111111111',
        livepeer_playback_id: "legacy'play",
        frameworks_asset_id: 'fw-asset-202611280133060c818dff6b2c412c',
        frameworks_playback_id: 'jZaV9t7k0yxBZVhm',
      },
    },
  ],
};

async function scratch() {
  const db = new PGlite();
  await db.exec(`
    create table public.video_assets (
      id integer primary key,
      asset_id text,
      playback_id text,
      provider text,
      livepeer_asset_id text,
      livepeer_playback_id text,
      frameworks_asset_id text,
      frameworks_playback_id text
    );
  `);
  await db.exec(`
    insert into public.video_assets
      (id, asset_id, playback_id, provider, livepeer_asset_id, livepeer_playback_id, frameworks_asset_id, frameworks_playback_id)
    values (145, '11111111-1111-1111-1111-111111111111', 'legacy''play', 'livepeer',
            '11111111-1111-1111-1111-111111111111', 'legacy''play', null, null);
  `);
  return db;
}

const count = async (db: PGlite, predicate: string) => {
  const result = await db.query<{ n: number }>(`select count(*)::int as n from public.video_assets where ${predicate}`);
  return result.rows[0].n;
};

describe('identityStatePredicates against Postgres', () => {
  it('matches an untouched legacy row only on the before predicate', async () => {
    const [row] = identityStatePredicates(plan);
    const db = await scratch();

    expect(row.before).toContain('IS NOT DISTINCT FROM NULL');
    expect(await count(db, row.before)).toBe(1);
    expect(await count(db, row.after)).toBe(0);
  });

  it('matches the applied row only on the after predicate', async () => {
    const [row] = identityStatePredicates(plan);
    const db = await scratch();

    await db.exec(`
      update public.video_assets set
        asset_id = 'fw-asset-202611280133060c818dff6b2c412c',
        playback_id = 'jZaV9t7k0yxBZVhm',
        provider = 'frameworks',
        frameworks_asset_id = 'fw-asset-202611280133060c818dff6b2c412c',
        frameworks_playback_id = 'jZaV9t7k0yxBZVhm'
      where id = 145;
    `);

    expect(await count(db, row.before)).toBe(0);
    expect(await count(db, row.after)).toBe(1);
  });

  it('escapes an apostrophe so the predicate matches, and a naive null comparison does not', async () => {
    const [row] = identityStatePredicates(plan);
    const db = await scratch();

    // The apostrophe survived quoting: the predicate still matches the row carrying "legacy'play".
    expect(row.before).toContain("'legacy''play'");
    expect(row.before).toContain('id=145');
    expect(await count(db, `playback_id = 'legacy''play' AND ${row.before}`)).toBe(1);

    // What string interpolation would have produced for the null field, and why it is wrong:
    expect(await count(db, `frameworks_asset_id = 'null'`)).toBe(0);
  });

  it('reports neither-predicate for a row that matches no state, which is the ambiguous case', async () => {
    const [row] = identityStatePredicates(plan);
    const db = await scratch();

    await db.exec(`update public.video_assets set frameworks_asset_id = 'someone-elses-asset' where id = 145;`);

    expect(await count(db, row.before)).toBe(0);
    expect(await count(db, row.after)).toBe(0);
  });
});

describe('predicate scoping', () => {
  it('reports neither state for the target when a different row carries the planned values', async () => {
    const [row] = identityStatePredicates(plan);
    const db = await scratch();

    // Target row drifts to a third state...
    await db.exec("update public.video_assets set frameworks_asset_id = 'someone-elses-asset' where id = 145;");
    // ...while a different row independently holds exactly the planned after values.
    await db.exec(`
      insert into public.video_assets values (
        999, 'fw-asset-202611280133060c818dff6b2c412c', 'jZaV9t7k0yxBZVhm', 'frameworks',
        '11111111-1111-1111-1111-111111111111', 'legacy''play',
        'fw-asset-202611280133060c818dff6b2c412c', 'jZaV9t7k0yxBZVhm');
    `);

    // The predicates are row-scoped, so row 999 cannot stand in for row 145.
    expect(await count(db, row.before)).toBe(0);
    expect(await count(db, row.after)).toBe(0);

    // An unscoped comparison would have matched the impostor row and reported "applied".
    const unscoped = row.after.replace(/^id=\d+ AND /, '');
    expect(await count(db, unscoped)).toBe(1);
  });
});
