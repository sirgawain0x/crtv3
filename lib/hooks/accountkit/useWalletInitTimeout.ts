"use client";

import { useEffect, useState } from "react";
import {
  WALLET_INIT_TIMEOUT_MS,
  hasWalletInitTimedOut,
} from "@/lib/wallet/wallet-init-timeout";

/**
 * Returns true when `isLoading` has been true continuously for WALLET_INIT_TIMEOUT_MS.
 */
export function useWalletInitTimeout(isLoading: boolean): boolean {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setStartedAt(null);
      setTimedOut(false);
      return;
    }
    if (startedAt == null) {
      setStartedAt(Date.now());
      return;
    }
    const remaining = WALLET_INIT_TIMEOUT_MS - (Date.now() - startedAt);
    if (remaining <= 0) {
      setTimedOut(true);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), remaining);
    return () => clearTimeout(timer);
  }, [isLoading, startedAt]);

  return timedOut || hasWalletInitTimedOut(startedAt);
}
