import {
  parseImportLedgerRows,
  type ImportLedgerRow,
} from './import-mapping-copy';

export const IMPORT_LEDGER_PAGE_SIZE = 500;

export type LedgerPageResult = {
  data: unknown[] | null;
  error: { message: string } | null;
  totalCount?: number | null;
  contentRange?: string | null;
};

export type LedgerPageQuery = (
  from: number,
  to: number,
) => Promise<LedgerPageResult>;

export function totalFromContentRange(
  contentRange: string | null | undefined,
): number | null {
  if (!contentRange) return null;
  const slash = contentRange.lastIndexOf('/');
  if (slash < 0) return null;
  const totalPart = contentRange.slice(slash + 1);
  if (totalPart === '*') return null;
  const total = Number(totalPart);
  return Number.isInteger(total) && total >= 0 ? total : null;
}

function resolveExpectedTotal(
  current: number | null,
  totalCount: number | null | undefined,
  contentRange: string | null | undefined,
): number | null {
  const candidate = totalCount ?? totalFromContentRange(contentRange);
  if (candidate === null || candidate === undefined) return current;
  if (current !== null && current !== candidate) {
    throw new Error('Inconsistent ledger exact count');
  }
  return candidate;
}

/** Paginate PostgREST reads; fail closed unless exact count matches rows read. */
export async function fetchImportLedgerRows(
  queryPage: LedgerPageQuery,
): Promise<ImportLedgerRow[]> {
  const rows: ImportLedgerRow[] = [];
  let expectedTotal: number | null = null;

  for (let from = 0; ; from += IMPORT_LEDGER_PAGE_SIZE) {
    const to = from + IMPORT_LEDGER_PAGE_SIZE - 1;
    const page = await queryPage(from, to);
    if (page.error) throw new Error('Cannot read frameworks_asset_imports ledger');

    expectedTotal = resolveExpectedTotal(
      expectedTotal,
      page.totalCount ?? null,
      page.contentRange ?? null,
    );

    if (!page.data?.length) {
      if (from === 0 && expectedTotal === 0) return [];
      if (expectedTotal !== null && rows.length !== expectedTotal) {
        throw new Error('Ledger read incomplete: empty page before full count');
      }
      break;
    }

    rows.push(...parseImportLedgerRows(page.data));

    if (expectedTotal !== null) {
      if (rows.length > expectedTotal) {
        throw new Error('Ledger read over-fetched relative to exact count');
      }
      if (rows.length === expectedTotal) break;
    }

    if (page.data.length < IMPORT_LEDGER_PAGE_SIZE) {
      if (expectedTotal === null) {
        throw new Error(
          'Ledger read incomplete: short page without exact count confirmation',
        );
      }
      if (rows.length !== expectedTotal) {
        throw new Error(
          'Ledger read truncated: short page without matching exact count',
        );
      }
      break;
    }
  }

  if (expectedTotal === null) {
    throw new Error('Ledger read incomplete: exact count was not confirmed');
  }
  if (rows.length !== expectedTotal) {
    throw new Error(
      `Ledger read incomplete: expected ${expectedTotal} rows, read ${rows.length}`,
    );
  }
  return rows;
}