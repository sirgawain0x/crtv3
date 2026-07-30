"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";

type MembershipApiResponse = {
  memberships?: Array<{ isValid?: boolean }>;
  error?: string;
};

const cache = new Map<string, boolean>();
const inflight = new Map<string, Promise<boolean>>();

async function fetchHasMembership(address: string): Promise<boolean> {
  const key = address.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: key }),
      });
      if (!res.ok) {
        cache.set(key, false);
        return false;
      }
      const data = (await res.json()) as MembershipApiResponse;
      const hasMembership = Boolean(
        data.memberships?.some((m) => m.isValid === true),
      );
      cache.set(key, hasMembership);
      return hasMembership;
    } catch {
      cache.set(key, false);
      return false;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/**
 * Whether `address` holds a valid Unlock Creative membership (any lock).
 * Results are cached in-memory for the session to avoid repeat RPC lookups.
 */
export function useAddressHasMembership(address?: string | null) {
  const normalized =
    address && isAddress(address) ? address.toLowerCase() : null;
  const [hasMembership, setHasMembership] = useState(() =>
    normalized ? (cache.get(normalized) ?? false) : false,
  );
  const [isLoading, setIsLoading] = useState(() =>
    normalized ? !cache.has(normalized) : false,
  );

  useEffect(() => {
    if (!normalized) {
      setHasMembership(false);
      setIsLoading(false);
      return;
    }

    if (cache.has(normalized)) {
      setHasMembership(cache.get(normalized) ?? false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void fetchHasMembership(normalized).then((value) => {
      if (cancelled) return;
      setHasMembership(value);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [normalized]);

  return { hasMembership, isLoading };
}
