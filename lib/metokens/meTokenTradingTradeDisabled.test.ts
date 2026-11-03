import { describe, expect, it } from 'vitest';
import {
  isMeTokenTradeInFlight,
  registerMeTokenTradeInFlight,
} from '@/lib/wallet/meTokenTradeInFlight';
import { isMeTokenTradingDisabled } from '@/lib/metokens/meTokenTradingTradeDisabled';

const TOKEN = '0xAbCdEf0000000000000000000000000000000001';

describe('meToken trade in-flight lock', () => {
  it('disables trading until the registered operation settles', async () => {
    let resolveOp!: (value: { hash: string }) => void;
    const operation = new Promise<{ hash: string }>((resolve) => {
      resolveOp = resolve;
    });

    registerMeTokenTradeInFlight(TOKEN, operation);
    expect(isMeTokenTradeInFlight(TOKEN)).toBe(true);
    expect(
      isMeTokenTradingDisabled({
        isLoading: false,
        isMembershipLoading: false,
        tradeInFlight: true,
      }),
    ).toBe(true);

    resolveOp({ hash: '0x1' });
    await operation;
    await Promise.resolve();

    expect(isMeTokenTradeInFlight(TOKEN)).toBe(false);
    expect(
      isMeTokenTradingDisabled({
        isLoading: false,
        isMembershipLoading: false,
        tradeInFlight: false,
      }),
    ).toBe(false);
  });
});
