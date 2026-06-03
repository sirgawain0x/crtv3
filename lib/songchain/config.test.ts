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
