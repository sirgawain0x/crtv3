"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { hasValidBrandPass } from "@/lib/access/creator-membership";

type MembershipApiItem = {
  name?: string;
  address?: string;
  isValid?: boolean;
};

type MembershipApiResponse = {
  memberships?: MembershipApiItem[];
  error?: string;
};

export type AddressMembershipStatus = {
  hasMembership: boolean;
  /** Valid Creative Brand Pass. */
  hasBrandMembership: boolean;
};

const EMPTY_STATUS: AddressMembershipStatus = {
  hasMembership: false,
  hasBrandMembership: false,
};

const cache = new Map<string, AddressMembershipStatus>();
const cachedAt = new Map<string, number>();
const CACHE_TTL = 60_000;

function cachedStatus(address: string) {
  return Date.now() - (cachedAt.get(address) ?? 0) < CACHE_TTL ? cache.get(address) : undefined;
}

const inflight = new Map<string, Promise<AddressMembershipStatus>>();

function summarizeMemberships(
  memberships: MembershipApiItem[] | undefined,
): AddressMembershipStatus {
  const normalized =
    memberships
      ?.filter(
        (m): m is MembershipApiItem & { address: string; isValid: boolean } =>
          typeof m.address === "string" &&
          m.address.length > 0 &&
          typeof m.isValid === "boolean",
      )
      .map((m) => ({ address: m.address, isValid: m.isValid })) ?? [];
  const hasMembership = normalized.some((m) => m.isValid);
  const hasBrandMembership = hasValidBrandPass(normalized);
  return {
    hasMembership,
    hasBrandMembership,
  };
}

async function fetchMembershipStatus(
  address: string,
): Promise<AddressMembershipStatus> {
  const key = address.toLowerCase();
  const cached = cachedStatus(key);
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
        return EMPTY_STATUS;
      }
      const data = (await res.json()) as MembershipApiResponse;
      if (data.error || !Array.isArray(data.memberships)) return EMPTY_STATUS;
      const status = summarizeMemberships(data.memberships);
      cache.set(key, status);
      cachedAt.set(key, Date.now());
      return status;
    } catch {
      return EMPTY_STATUS;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/**
 * Whether `address` holds a valid Unlock Creative membership (any lock),
 * and whether Brand Pass specifically is held (gold badge).
 * Successful results are cached for one minute; failed lookups are retried.
 */
export function useAddressHasMembership(address?: string | null) {
  const normalized =
    address && isAddress(address) ? address.toLowerCase() : null;
  const [status, setStatus] = useState<AddressMembershipStatus>(() =>
    normalized ? (cachedStatus(normalized) ?? EMPTY_STATUS) : EMPTY_STATUS,
  );
  const [isLoading, setIsLoading] = useState(() =>
    normalized ? !cachedStatus(normalized) : false,
  );

  useEffect(() => {
    if (!normalized) {
      setStatus(EMPTY_STATUS);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setStatus(cachedStatus(normalized) ?? EMPTY_STATUS);
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      setIsLoading(!cachedStatus(normalized));
      const value = await fetchMembershipStatus(normalized);
      if (cancelled) return;
      setStatus(value);
      setIsLoading(false);
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), CACHE_TTL);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [normalized]);

  return {
    hasMembership: status.hasMembership,
    hasBrandMembership: status.hasBrandMembership,
    isLoading,
  };
}
