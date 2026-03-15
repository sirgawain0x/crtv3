"use client";

import { useEffect, useState } from "react";
import { config } from "@/config";
import { Loader2 } from "lucide-react";

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
 * Uses useEffect + deferred setState so we never update this component during a child's render
 * (avoids "Cannot update a component while rendering a different component").
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
      // Defer setState to next tick so we don't update during another component's render
      timeoutId = setTimeout(() => setReady(true), 0);
    });
    // In case store became ready before we subscribed
    if (isStoreReady()) setReady(true);
    return () => {
      unsub();
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
