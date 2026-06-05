import { describe, it, expect, afterEach } from 'vitest';
import { getSongchainConfig } from './config';

describe('getSongchainConfig', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('reports enabled when any primitive id is set', () => {
    process.env.NEXT_PUBLIC_SONGCHAIN_FEED_ID = '0xabc0000000000000000000000000000000000001';
    const config = getSongchainConfig();
    expect(config.enabled).toBe(true);
    expect(config.publicFeedId).toBe(
      '0xabc0000000000000000000000000000000000001',
    );
    expect(config.hallidayOutputAsset).toContain(':');
    expect(config.hallidayInputAssets).toEqual(['usd']);
  });

  it('normalizes addresses to lowercase', () => {
    process.env.NEXT_PUBLIC_SONGCHAIN_GROUP_ID =
      '0xAbC0000000000000000000000000000000000001';
    const config = getSongchainConfig();
    expect(config.groupId).toBe(
      '0xabc0000000000000000000000000000000000001',
    );
  });

  it('accepts Lens contract IDs that include an address', () => {
    process.env.NEXT_PUBLIC_SONGCHAIN_FEED_ID =
      'lens:0xAbC0000000000000000000000000000000000001';
    process.env.NEXT_PUBLIC_SONGCHAIN_EXCLUSIVE_FEED_ID =
      'https://developer.lens.xyz/contracts/0xDeF0000000000000000000000000000000000002';

    const config = getSongchainConfig();

    expect(config.publicFeedId).toBe(
      '0xabc0000000000000000000000000000000000001',
    );
    expect(config.exclusiveFeedId).toBe(
      '0xdef0000000000000000000000000000000000002',
    );
  });

  it('reads app id separately from feed ids', () => {
    process.env.NEXT_PUBLIC_SONGCHAIN_APP_ID =
      '0x3412C2509EeF4f9A133E6D3638B9B3c06fc30111';
    process.env.NEXT_PUBLIC_SONGCHAIN_GRAPH_ID =
      '0x2B36706E8E352a273c34D108A5854A55cb2302A6';
    const config = getSongchainConfig();
    expect(config.appId).toBe('0x3412c2509eef4f9a133e6d3638b9b3c06fc30111');
    expect(config.graphId).toBe('0x2b36706e8e352a273c34d108a5854a55cb2302a6');
    expect(config.enabled).toBe(true);
  });

  it('falls back to server-only env keys when NEXT_PUBLIC vars are unset', () => {
    delete process.env.NEXT_PUBLIC_SONGCHAIN_FEED_ID;
    process.env.SONGCHAIN_FEED_ID =
      '0xdef0000000000000000000000000000000000002';
    const config = getSongchainConfig();
    expect(config.publicFeedId).toBe(
      '0xdef0000000000000000000000000000000000002',
    );
    expect(config.enabled).toBe(true);
  });
});
