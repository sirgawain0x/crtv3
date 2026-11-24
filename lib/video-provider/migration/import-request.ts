import type { ArchivedSource } from './archive';
import type { MigrationMode } from './batch';
import type { ImportOutcome } from './importer';
import { ImportStoppedError, type ImportFailureCode } from './import-failure';

export type MigrationImportResponse =
  | { outcome: ImportOutcome; recovery?: boolean }
  | { message: string }
  | { diagnostic: Record<string, unknown> & { playableManifest?: boolean } }
  | { error: string; failureCode?: ImportFailureCode };

const importFailureCodes = ['policy-unconfirmed', 'provider-auth', 'provider-validation', 'provider-timeout', 'provider-unavailable'] as const satisfies readonly ImportFailureCode[];

export function importFailureCodeFromBody(body: unknown): ImportFailureCode | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const code = (body as { failureCode?: unknown }).failureCode;
  return typeof code === 'string' && (importFailureCodes as readonly string[]).includes(code) ? code as ImportFailureCode : undefined;
}

/** Reconstruct classified import stops from safe admin JSON; never surface raw provider bodies. */
export async function parseMigrationImportResponse(response: Response): Promise<MigrationImportResponse> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const failureCode = importFailureCodeFromBody(result);
    if (failureCode) throw new ImportStoppedError(failureCode);
    const message = typeof (result as { error?: unknown }).error === 'string' ? (result as { error: string }).error : 'Migration request failed';
    throw new Error(message);
  }
  return result as MigrationImportResponse;
}

export async function requestMigrationImport(
  input: { mode: MigrationMode; source: ArchivedSource },
  options: { fetch?: typeof fetch; url?: string; headers?: HeadersInit } = {},
): Promise<MigrationImportResponse> {
  const response = await (options.fetch ?? fetch)(options.url ?? '/api/migration/frameworks/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(input),
  });
  return parseMigrationImportResponse(response);
}
