import {
  parseImportLedgerRows,
  type ImportLedgerRow,
} from './import-mapping-copy';

export const IMPORT_LEDGER_PAGE_SIZE = 500;

export type LedgerPageQuery = (
  from: number,
  to: number,
) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;

/** Paginate PostgREST reads until a short page; never silently truncate. */
export async function fetchImportLedgerRows(
  queryPage: LedgerPageQuery,
): Promise<ImportLedgerRow[]> {
  const rows: ImportLedgerRow[] = [];
  for (let from = 0; ; from += IMPORT_LEDGER_PAGE_SIZE) {
    const to = from + IMPORT_LEDGER_PAGE_SIZE - 1;
    const { data, error } = await queryPage(from, to);
    if (error) throw new Error('Cannot read frameworks_asset_imports ledger');
    if (!data?.length) break;
    rows.push(...parseImportLedgerRows(data));
    if (data.length < IMPORT_LEDGER_PAGE_SIZE) break;
  }
  return rows;
}