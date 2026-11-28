import { describe, expect, it } from 'vitest';
import { createImportLedger, ledgerSelectColumns, legacyRecoveryColumns } from './supabase-ledger';

describe('ledgerSelectColumns', () => {
  it('includes provider failure context only on frameworks_asset_imports', () => {
    expect(ledgerSelectColumns('frameworks_asset_imports')).toContain('provider_failure_phase');
    expect(ledgerSelectColumns('frameworks_asset_imports')).toContain('provider_failure_reason');
    const recovery = ledgerSelectColumns('frameworks_import_recoveries');
    expect(recovery).not.toContain('provider_failure');
    expect(recovery.split(',').sort()).toEqual(
      'livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,state,frameworks_asset_id,frameworks_playback_id,derivative_sha256,derivative_bytes,derivative_origin,recovery_kind,adopted_at'
        .split(',')
        .sort(),
    );
  });

  it('keeps the legacy recovery selection free of the excluded migration columns', () => {
    const legacy = legacyRecoveryColumns().split(',');
    expect(legacy).toContain('frameworks_asset_id');
    expect(legacy).not.toContain('derivative_sha256');
    expect(legacy).not.toContain('recovery_kind');
  });
});

/** Records every select() column list and replays queued responses in order. */
function fakeDb(responses: Array<{ data?: unknown; error?: unknown }>) {
  const selects: string[] = [];
  let index = 0;
  const db = {
    from() {
      return {
        select(columns: string) {
          selects.push(columns);
          const response = responses[index] ?? { data: null, error: null };
          index += 1;
          const chain = {
            eq: () => chain,
            maybeSingle: async () => response,
            single: async () => response,
          };
          return chain;
        },
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) }),
      };
    },
  };
  return { db: db as never, selects };
}

describe('createImportLedger recovery schema compatibility', () => {
  it('degrades to the legacy selection when the derivative migration is absent', async () => {
    const { db, selects } = fakeDb([
      { error: { code: '42703', message: 'column frameworks_import_recoveries.derivative_sha256 does not exist' } },
      { data: { livepeer_asset_id: 'a', state: 'ready' }, error: null },
    ]);
    const ledger = createImportLedger(db, 'frameworks_import_recoveries');

    const record = await ledger.find('a');

    expect(record).toEqual({ livepeer_asset_id: 'a', state: 'ready' });
    expect(selects).toHaveLength(2);
    expect(selects[0]).toContain('derivative_sha256');
    expect(selects[1]).toBe(legacyRecoveryColumns());
  });

  it('stays on the legacy selection after degrading, without re-probing', async () => {
    const { db, selects } = fakeDb([
      { error: { code: '42703', message: 'column does not exist' } },
      { data: null, error: null },
      { data: { livepeer_asset_id: 'b' }, error: null },
    ]);
    const ledger = createImportLedger(db, 'frameworks_import_recoveries');

    await ledger.find('a');
    await ledger.find('b');

    expect(selects[2]).toBe(legacyRecoveryColumns());
  });

  it('throws instead of degrading when the failure is not a missing column', async () => {
    const { db, selects } = fakeDb([{ error: { code: '57014', message: 'canceling statement due to statement timeout' } }]);
    const ledger = createImportLedger(db, 'frameworks_import_recoveries');

    await expect(ledger.find('a')).rejects.toThrow('Cannot read migration import ledger');
    expect(selects).toHaveLength(1);
  });

  it('never degrades the import ledger, which must report its own missing columns', async () => {
    const { db, selects } = fakeDb([{ error: { code: '42703', message: 'column does not exist' } }]);
    const ledger = createImportLedger(db, 'frameworks_asset_imports');

    await expect(ledger.find('a')).rejects.toThrow('Cannot read migration import ledger');
    expect(selects).toHaveLength(1);
  });
});
