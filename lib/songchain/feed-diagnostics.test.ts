import { describe, expect, it } from 'vitest';
import {
  getFeedDiagnosticInfo,
  getLensNetworkLabel,
  truncateFeedId,
} from '@/lib/songchain/feed-diagnostics';

describe('feed-diagnostics', () => {
  it('truncates long feed ids', () => {
    const id = '0xabcdef1234567890abcdef1234567890abcdef12';
    expect(truncateFeedId(id)).toMatch(/^0xabcdef…/);
  });

  it('returns not configured for null feed', () => {
    expect(truncateFeedId(null)).toBe('not configured');
  });

  it('builds diagnostic info', () => {
    const info = getFeedDiagnosticInfo('0xabc0000000000000000000000000000000000001');
    expect(info.feedIdDisplay).toContain('0xabc000');
    expect(getLensNetworkLabel('testnet')).toBe('Lens testnet (Sepolia)');
  });
});
