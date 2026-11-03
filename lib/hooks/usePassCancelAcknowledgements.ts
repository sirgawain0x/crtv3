"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPassCancelAcknowledgement,
  clearPassCancelAcknowledgementsForLock,
  passCancelLockPrefix,
  prunePassCancelAcknowledgements,
  readPassCancelAcknowledgements,
} from "@/lib/access/pass-cancel-acknowledgements";

function readCancelledKeysForWallet(
  walletAddress: string,
  activePassKeys: ReadonlySet<string>,
): Set<string> {
  if (activePassKeys.size > 0) {
    return prunePassCancelAcknowledgements(walletAddress, activePassKeys);
  }
  return readPassCancelAcknowledgements(walletAddress);
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

  const cancelledPassKeys = useMemo(() => {
    const merged = new Set(persistedKeys);
    for (const key of sessionOverlay) {
      merged.add(key);
    }
    return merged;
  }, [persistedKeys, sessionOverlay]);

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

  const clearPassCancelForLock = useCallback(
    (lockAddress: string) => {
      if (!walletAddress) {
        return;
      }
      clearPassCancelAcknowledgementsForLock(walletAddress, lockAddress);
      const prefix = passCancelLockPrefix(walletAddress, lockAddress);
      setSessionOverlay((prev) => new Set([...prev].filter((key) => !key.startsWith(prefix))));
    },
    [walletAddress],
  );

  return {
    cancelledPassKeys,
    acknowledgePassCancel,
    clearPassCancelForLock,
    cancelControlsReady,
  };
}
