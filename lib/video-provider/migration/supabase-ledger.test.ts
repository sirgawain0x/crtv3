import { describe, expect, it } from 'vitest';
import { ledgerSelectColumns } from './supabase-ledger';

describe('ledgerSelectColumns', () => {
  it('includes provider failure context only on frameworks_asset_imports', () => {
    expect(ledgerSelectColumns('frameworks_asset_imports')).toContain('provider_failure_phase');
    expect(ledgerSelectColumns('frameworks_asset_imports')).toContain('provider_failure_reason');
    const recovery = ledgerSelectColumns('frameworks_import_recoveries');
    expect(recovery).not.toContain('provider_failure');
    expect(recovery.split(',').sort()).toEqual(
      'livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,state,frameworks_asset_id,frameworks_playback_id'
        .split(',')
        .sort(),
    );
  });
});