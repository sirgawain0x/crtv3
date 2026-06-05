"use client";

import { useEffect, useState } from "react";
import { config } from "@/config";
import { GuardLoadingFallback } from "@/components/auth/GuardLoadingFallback";

function isStoreReady(): boolean {
  try {
    const store = (config as {
      store?: {
        getState: () => {
          chain?: { id: number };
          connections?: Record<number, unknown> | Map<number, unknown>;
        };
      };
    }).store;
    if (!store) return true;
    const state = store.getState();
    if (state?.chain?.id == null) return false;
    const conn = state.connections;
    if (conn == null) return false;
    return typeof (conn as Map<number, unknown>).has === "function"
      ? (conn as Map<number, unknown>).has(state.chain.id)
      : state.chain.id in (conn as Record<number, unknown>);
  } catch {
    return false;
  }
}

/**
 * Renders children only after the Account Kit store has the current chain in connections.
 * Prevents ChainNotFoundError when useSmartAccountClient runs before the store is ready.
 */
export function AccountKitStoreGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStoreReady()) {
      setReady(true);
      return;
    }
    const store = (config as { store?: { subscribe: (cb: () => void) => () => void } }).store;
    if (!store?.subscribe) {
      setReady(true);
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const unsub = store.subscribe(() => {
      if (!isStoreReady()) return;
      timeoutId = setTimeout(() => setReady(true), 0);
    });
    if (isStoreReady()) setReady(true);
    return () => {
      unsub();
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <GuardLoadingFallback
      isLoading={!ready}
      allowBypass
      message="Connecting wallet services…"
    >
      {children}
    </GuardLoadingFallback>
  );
}
