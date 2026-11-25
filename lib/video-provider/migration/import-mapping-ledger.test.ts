import { describe, expect, it, vi } from 'vitest';
import {
  IMPORT_LEDGER_PAGE_SIZE,
  fetchImportLedgerRows,
} from './import-mapping-ledger';
import type { ImportLedgerRow } from './import-mapping-copy';

function uuidAt(index: number): string {
  const hex = index.toString(16).padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4124-8124-${hex.slice(16, 32)}`;
}

function row(id: string): ImportLedgerRow {
  return {
    livepeer_asset_id: id,
    livepeer_playback_id: 'play',
    source_sha256: 'a'.repeat(64),
    source_bytes: 1,
    state: 'ready',
    frameworks_asset_id: `fw-${id.slice(0, 8)}`,
    frameworks_playback_id: `fp-${id.slice(0, 8)}`,
  };
}

describe('fetchImportLedgerRows', () => {
  it('paginates until a short page and surfaces query errors', async () => {
    const total = IMPORT_LEDGER_PAGE_SIZE + 3;
    const all = Array.from({ length: total }, (_, i) => row(uuidAt(i + 1)));
    const queryPage = vi.fn(async (from: number, to: number) => {
      const page = all.slice(from, to + 1);
      return { data: page, error: null };
    });
    const loaded = await fetchImportLedgerRows(queryPage);
    expect(loaded).toHaveLength(total);
    expect(queryPage).toHaveBeenCalledTimes(2);
    await expect(
      fetchImportLedgerRows(async () => ({
        data: null,
        error: { message: 'boom' },
      })),
    ).rejects.toThrow(/ledger/);
  });
});