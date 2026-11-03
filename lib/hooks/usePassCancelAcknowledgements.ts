"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addPassCancelAcknowledgement,
  readPassCancelAcknowledgements,
} from "@/lib/access/pass-cancel-acknowledgements";

export function usePassCancelAcknowledgements(walletAddress?: string) {
  const [cancelledPassKeys, setCancelledPassKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!walletAddress) {
      setCancelledPassKeys(new Set());
      return;
    }
    setCancelledPassKeys(readPassCancelAcknowledgements(walletAddress));
  }, [walletAddress]);

  const acknowledgePassCancel = useCallback(
    (passKey: string) => {
      if (!walletAddress) {
        setCancelledPassKeys((prev) => new Set(prev).add(passKey));
        return;
      }
      setCancelledPassKeys((prev) =>
        addPassCancelAcknowledgement(walletAddress, passKey, prev),
      );
    },
    [walletAddress],
  );

  return { cancelledPassKeys, acknowledgePassCancel };
}
