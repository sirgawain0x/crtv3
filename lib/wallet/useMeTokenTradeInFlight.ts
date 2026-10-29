'use client';

import { useSyncExternalStore } from 'react';
import {
  isMeTokenTradeInFlight,
  subscribeMeTokenTradeInFlight,
} from '@/lib/wallet/meTokenTradeInFlight';

export function useMeTokenTradeInFlight(
  meTokenAddress: string | undefined,
): boolean {
  return useSyncExternalStore(
    subscribeMeTokenTradeInFlight,
    () =>
      meTokenAddress ? isMeTokenTradeInFlight(meTokenAddress) : false,
    () => false,
  );
}
