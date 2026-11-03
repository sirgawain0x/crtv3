export type LiveStudioAuthPhase = "privy_init" | "logged_out" | "authenticated";

/** Privy must be ready before treating the user as logged out. */
export function resolveLiveStudioAuthPhase(input: {
  privyReady: boolean;
  isAuthenticated: boolean;
}): LiveStudioAuthPhase {
  if (!input.privyReady) return "privy_init";
  if (!input.isAuthenticated) return "logged_out";
  return "authenticated";
}
