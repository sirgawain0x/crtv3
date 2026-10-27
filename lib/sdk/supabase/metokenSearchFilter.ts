import { isEthereumAddress } from '@/lib/market/tokenSearch';

/**
 * Escape user text embedded in PostgREST `.or()` ilike values.
 * Commas and parentheses are filter-syntax special; wrap the pattern in quotes when present.
 */
export function wrapPostgrestIlikePattern(searchTerm: string): string {
  const inner = searchTerm.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const pattern = `%${inner}%`;
  if (/[(),]/.test(inner)) {
    return `"${pattern}"`;
  }
  return pattern;
}

export function buildMeTokenTextSearchOrClause(search: string): string {
  const pattern = wrapPostgrestIlikePattern(search.trim());
  return `name.ilike.${pattern},symbol.ilike.${pattern},owner_address.ilike.${pattern},address.ilike.${pattern}`;
}

export type MeTokenSupabaseSearch =
  | { kind: 'exact_address'; normalized: string }
  | { kind: 'text'; orClause: string };

export function resolveMeTokenSupabaseSearch(search: string): MeTokenSupabaseSearch {
  const trimmed = search.trim();
  if (isEthereumAddress(trimmed)) {
    return { kind: 'exact_address', normalized: trimmed.toLowerCase() };
  }
  return { kind: 'text', orClause: buildMeTokenTextSearchOrClause(trimmed) };
}
