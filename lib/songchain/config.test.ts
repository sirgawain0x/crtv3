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
  });

  it('normalizes addresses to lowercase', () => {
    process.env.NEXT_PUBLIC_SONGCHAIN_GROUP_ID =
      '0xAbC0000000000000000000000000000000000001';
    const config = getSongchainConfig();
    expect(config.groupId).toBe(
      '0xabc0000000000000000000000000000000000001',
    );
  });
});
