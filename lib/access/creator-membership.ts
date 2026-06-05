import { LOCK_ADDRESSES } from "@/lib/sdk/unlock/services";

export type MembershipLike = {
  address: string;
  isValid: boolean;
};

/** Creative Pass Plus — creators blocked from prediction create/bet (anti-cheat). */
export function hasValidCreatorPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  if (!memberships?.length) return false;
  const creatorLock = LOCK_ADDRESSES.BASE_CREATIVE_PASS_2.toLowerCase();
  return memberships.some(
    (m) => m.isValid && m.address.toLowerCase() === creatorLock
  );
}

/** Brand pass — required to create Snapshot campaigns (plus admin). */
export function hasValidBrandPass(
  memberships: MembershipLike[] | null | undefined
): boolean {
  if (!memberships?.length) return false;
  const brandLock = LOCK_ADDRESSES.BASE_CREATIVE_PASS.toLowerCase();
  return memberships.some(
    (m) => m.isValid && m.address.toLowerCase() === brandLock
  );
}
