import { LOCK_ADDRESSES } from "@/lib/sdk/unlock/services";

export type MembershipLike = {
  address: string;
  isValid: boolean;
};

function hasValidLock(
  memberships: MembershipLike[] | null | undefined,
  locks: string[]
): boolean {
  if (!memberships?.length) return false;
  const normalized = locks.map((l) => l.toLowerCase()).filter(Boolean);
  return memberships.some(
    (m) => m.isValid && normalized.includes(m.address.toLowerCase())
  );
}

/**
 * Creative Creator Pass — blocked from prediction create/bet (anti-cheat).
 */
export function hasValidCreatorPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [LOCK_ADDRESSES.BASE_CREATIVE_PASS]);
}

/**
 * Brand pass — required to create Snapshot campaigns (plus admin).
 */
export function hasValidBrandPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [LOCK_ADDRESSES.BASE_CREATIVE_PASS_3]);
}

/**
 * Professional pass — unlimited predictions, but no live/campaign access.
 */
export function hasValidInvestorPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [LOCK_ADDRESSES.BASE_CREATIVE_PASS_2]);
}

/** Any paid Creative Platform pass. */
export function hasAnyValidPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return (
    hasValidCreatorPass(memberships) ||
    hasValidBrandPass(memberships) ||
    hasValidInvestorPass(memberships)
  );
}
