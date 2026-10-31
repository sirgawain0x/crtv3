"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSignMessage, useUser } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import type { AuthHeaders } from "@/lib/auth/useWalletAuth";
import { logger } from "@/lib/utils/logger";
import {
  isPlatformAdminWalletAuthReady,
  resolvePlatformAdminSignMode,
} from "@/lib/hooks/admin/platform-admin-wallet-auth";

const CACHE_LIFETIME_MS = 4 * 60 * 1000;

interface AuthCache {
  address: string;
  timestamp: number;
  signature: string;
  expiresAt: number;
}

function buildMessage(address: string, timestamp: number): string {
  return `Authorize Creative TV request for address ${address.toLowerCase()} at ${timestamp}`;
}

/**
 * Signs platform-admin API requests for `/admin/creator-xmerch` only.
 * Supports admin EOA or smart account without altering global `useWalletAuth` readiness.
 */
export function usePlatformAdminWalletAuth(adminAuthAddress: string | null) {
  const user = useUser();
  const { smartAccountClient: accountClient, address: smartAccountAddress } =
    useModularAccount();

  const signMode = useMemo(
    () =>
      resolvePlatformAdminSignMode(
        adminAuthAddress,
        smartAccountAddress,
        user?.address ?? null,
      ),
    [adminAuthAddress, smartAccountAddress, user?.address],
  );

  const address = adminAuthAddress?.toLowerCase() ?? "";

  const cacheRef = useRef<AuthCache | null>(null);
  const pendingRef = useRef<{
    resolve: (sig: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const { signMessage } = useSignMessage({
    client: signMode === "smart-account" ? accountClient : undefined,
    onSuccess: (sig: string) => {
      pendingRef.current?.resolve(sig);
      pendingRef.current = null;
    },
    onError: (err: Error) => {
      pendingRef.current?.reject(err);
      pendingRef.current = null;
    },
  });

  useEffect(() => {
    if (cacheRef.current && cacheRef.current.address !== address) {
      cacheRef.current = null;
    }
  }, [address]);

  const getAuthHeaders = useCallback(async (): Promise<AuthHeaders> => {
    if (!address) {
      throw new Error("Platform admin auth address not available");
    }

    const now = Date.now();
    const cached = cacheRef.current;
    if (cached && cached.address === address && cached.expiresAt > now) {
      return {
        "X-Wallet-Address": cached.address,
        "X-Wallet-Timestamp": String(cached.timestamp),
        "X-Wallet-Signature": cached.signature,
      };
    }

    const timestamp = Math.floor(now / 1000);
    const message = buildMessage(address, timestamp);

    const signature = await new Promise<string>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      try {
        signMessage({ message });
      } catch (err) {
        pendingRef.current = null;
        reject(err instanceof Error ? err : new Error("signMessage failed"));
      }
    });

    cacheRef.current = {
      address,
      timestamp,
      signature,
      expiresAt: now + CACHE_LIFETIME_MS,
    };

    logger.debug("usePlatformAdminWalletAuth: cached new auth signature", {
      address,
      signMode,
    });

    return {
      "X-Wallet-Address": address,
      "X-Wallet-Timestamp": String(timestamp),
      "X-Wallet-Signature": signature,
    };
  }, [address, signMessage, signMode]);

  const isReady = isPlatformAdminWalletAuthReady(signMode, !!accountClient);

  return { getAuthHeaders, isReady, signMode };
}
