/** Whether membership verification is still in progress (not terminal). */
export function computeIsMembershipLoading(params: {
  isLoading: boolean;
  isVerified: boolean;
  hasUser: boolean;
  error: unknown | null;
}): boolean {
  if (params.isLoading) {
    return true;
  }
  if (!params.hasUser) {
    return false;
  }
  if (params.isVerified) {
    return false;
  }
  if (params.error != null) {
    return false;
  }
  return true;
}
