import { describe, expect, it } from 'vitest';
import {
  isMeTokenTradeInFlight,
  registerMeTokenTradeInFlight,
} from './meTokenTradeInFlight';

const TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

describe('registerMeTokenTradeInFlight', () => {
  it('clears the lock when the operation rejects without unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);

    try {
      const operation = Promise.reject(new Error('trade failed'));
      registerMeTokenTradeInFlight(TOKEN, operation);
      expect(isMeTokenTradeInFlight(TOKEN)).toBe(true);

      await operation.catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(isMeTokenTradeInFlight(TOKEN)).toBe(false);
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
