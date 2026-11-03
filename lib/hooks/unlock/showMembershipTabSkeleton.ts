/** Keep showing pass UI during background refetch when membership data is already loaded. */
export function showMembershipTabSkeleton(
  membershipLoading: boolean,
  hasCachedMembership: boolean,
): boolean {
  return membershipLoading && !hasCachedMembership;
}
