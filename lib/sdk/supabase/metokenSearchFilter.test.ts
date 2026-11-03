import { describe, expect, it } from 'vitest';
import {
  buildMeTokenTextSearchOrClause,
  resolveMeTokenSupabaseSearch,
  wrapPostgrestIlikePattern,
} from './metokenSearchFilter';

const HOLY1_CONTRACT = '0x1a37f7d9589e427ac2b0114f3265c1bd0bc02e85';
const HOLY1_OWNER = '0x365e9d11f0431b434770c3e0bc34f01af315b0bf';

describe('resolveMeTokenSupabaseSearch', () => {
  it('matches contract address OR owner wallet for full 0x searches', () => {
    const byContract = resolveMeTokenSupabaseSearch(HOLY1_CONTRACT);
    expect(byContract).toEqual({
      kind: 'exact_address',
      normalized: HOLY1_CONTRACT.toLowerCase(),
    });

    const byOwner = resolveMeTokenSupabaseSearch(HOLY1_OWNER);
    expect(byOwner).toEqual({
      kind: 'exact_address',
      normalized: HOLY1_OWNER.toLowerCase(),
    });

    const ownerFilter =
      byOwner.kind === 'exact_address'
        ? `address.eq.${byOwner.normalized},owner_address.eq.${byOwner.normalized}`
        : '';
    expect(ownerFilter).toBe(
      `address.eq.${HOLY1_OWNER.toLowerCase()},owner_address.eq.${HOLY1_OWNER.toLowerCase()}`
    );
  });

  it('normalizes checksummed addresses to lowercase', () => {
    const mixed = '0x365E9D11F0431b434770c3e0bc34f01AF315b0bf';
    const resolved = resolveMeTokenSupabaseSearch(mixed);
    expect(resolved.kind).toBe('exact_address');
    if (resolved.kind === 'exact_address') {
      expect(resolved.normalized).toBe(HOLY1_OWNER);
    }
  });
});

describe('wrapPostgrestIlikePattern', () => {
  it('quotes patterns containing commas or parentheses for PostgREST .or()', () => {
    expect(wrapPostgrestIlikePattern('foo,bar')).toBe('"%foo,bar%"');
    expect(wrapPostgrestIlikePattern('foo(bar)')).toBe('"%foo(bar)%"');
    expect(wrapPostgrestIlikePattern('HOLY1')).toBe('%HOLY1%');
  });
});

describe('buildMeTokenTextSearchOrClause', () => {
  it('escapes special characters in each ilike branch of the or clause', () => {
    const clause = buildMeTokenTextSearchOrClause('a,b');
    expect(clause).toBe(
      'name.ilike."%a,b%",symbol.ilike."%a,b%",owner_address.ilike."%a,b%",address.ilike."%a,b%"'
    );
  });
});
