import { describe, expect, it, vi } from 'vitest';
import {
  IMPORT_LEDGER_PAGE_SIZE,
  fetchImportLedgerRows,
  totalFromContentRange,
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
  it('paginates until exact count is satisfied and surfaces query errors', async () => {
    const total = IMPORT_LEDGER_PAGE_SIZE + 3;
    const all = Array.from({ length: total }, (_, i) => row(uuidAt(i + 1)));
    const queryPage = vi.fn(async (from: number, to: number) => {
      const page = all.slice(from, to + 1);
      return { data: page, error: null, totalCount: total };
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

  it('rejects a capped short first page when exact count proves truncation', async () => {
    const all = Array.from({ length: 100 }, (_, i) => row(uuidAt(i + 1)));
    await expect(
      fetchImportLedgerRows(async () => ({
        data: all,
        error: null,
        totalCount: 250,
      })),
    ).rejects.toThrow(/truncated|incomplete/);
  });

  it('accepts Content-Range totals when count is absent', async () => {
    const all = [row(uuidAt(1))];
    const loaded = await fetchImportLedgerRows(async () => ({
      data: all,
      error: null,
      contentRange: '0-0/1',
    }));
    expect(loaded).toHaveLength(1);
    expect(totalFromContentRange('0-99/250')).toBe(250);
  });
});