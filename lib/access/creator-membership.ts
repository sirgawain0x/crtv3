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

/** Creative Creator Pass or Creator Plus — blocked from prediction create/bet (anti-cheat). */
export function hasValidCreatorPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [
    LOCK_ADDRESSES.BASE_CREATIVE_PASS,
    LOCK_ADDRESSES.BASE_CREATIVE_CREATOR_PLUS,
  ]);
}

/** Brand pass or Brand Plus — required to create Snapshot campaigns (plus admin). */
export function hasValidBrandPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [
    LOCK_ADDRESSES.BASE_CREATIVE_PASS_3,
    LOCK_ADDRESSES.BASE_CREATIVE_BRAND_PLUS,
  ]);
}

/** Investor pass or Investor Plus — unlimited predictions, but no live/campaign access. */
export function hasValidInvestorPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [
    LOCK_ADDRESSES.BASE_CREATIVE_PASS_2,
    LOCK_ADDRESSES.BASE_CREATIVE_INVESTOR_PLUS,
  ]);
}

/** Any Plus pass (Creator, Investor, or Brand Plus) — gates Digital Twin / Pinata agent. */
export function hasValidPlusPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return hasValidLock(memberships, [
    LOCK_ADDRESSES.BASE_CREATIVE_CREATOR_PLUS,
    LOCK_ADDRESSES.BASE_CREATIVE_INVESTOR_PLUS,
    LOCK_ADDRESSES.BASE_CREATIVE_BRAND_PLUS,
  ]);
}

/** Any paid Creative Platform pass (base or Plus). */
export function hasAnyValidPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  return (
    hasValidCreatorPass(memberships) ||
    hasValidBrandPass(memberships) ||
    hasValidInvestorPass(memberships)
  );
}
