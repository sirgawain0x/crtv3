"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPassCancelAcknowledgement,
  prunePassCancelAcknowledgements,
  readPassCancelAcknowledgements,
} from "@/lib/access/pass-cancel-acknowledgements";

function readCancelledKeysForWallet(
  walletAddress: string,
  activePassKeys: ReadonlySet<string>,
): Set<string> {
  const stored = readPassCancelAcknowledgements(walletAddress);
  if (activePassKeys.size > 0) {
    return new Set([...stored].filter((key) => activePassKeys.has(key)));
  }
  return stored;
}

export function usePassCancelAcknowledgements(
  walletAddress: string | undefined,
  activePassKeys: ReadonlySet<string>,
) {
  const activePassKeysFingerprint = useMemo(
    () => [...activePassKeys].sort().join("|"),
    [activePassKeys],
  );

  const [sessionOverlay, setSessionOverlay] = useState<Set<string>>(() => new Set());

  const persistedKeys = useMemo(() => {
    if (!walletAddress) {
      return new Set<string>();
    }
    return readCancelledKeysForWallet(walletAddress, activePassKeys);
  }, [walletAddress, activePassKeys, activePassKeysFingerprint]);

  // Persist the pruning of stale acknowledgement keys (e.g. after a renewal
  // changes a pass's expiration). The render-path read stays synchronous and
  // pure so the first render already reflects the pruned set; only the
  // localStorage write moves out of render into this effect.
  useEffect(() => {
    if (!walletAddress || activePassKeys.size === 0) {
      return;
    }
    prunePassCancelAcknowledgements(walletAddress, activePassKeys);
  }, [walletAddress, activePassKeys, activePassKeysFingerprint]);

  const cancelledPassKeys = useMemo(() => {
    const merged = new Set(persistedKeys);
    for (const key of sessionOverlay) {
      merged.add(key);
    }
    if (activePassKeys.size > 0) {
      return new Set([...merged].filter((key) => activePassKeys.has(key)));
    }
    return merged;
  }, [persistedKeys, sessionOverlay, activePassKeys]);

  const cancelControlsReady = Boolean(walletAddress);

  useEffect(() => {
    setSessionOverlay(new Set());
  }, [walletAddress]);

  const acknowledgePassCancel = useCallback(
    (passKey: string) => {
      setSessionOverlay((prev) => new Set(prev).add(passKey));
      if (walletAddress) {
        addPassCancelAcknowledgement(
          walletAddress,
          passKey,
          readPassCancelAcknowledgements(walletAddress),
        );
      }
    },
    [walletAddress],
  );

  return {
    cancelledPassKeys,
    acknowledgePassCancel,
    cancelControlsReady,
  };
}
