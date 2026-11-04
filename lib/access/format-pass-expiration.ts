/** Format a Unlock key expiration (unix seconds) for pass UI copy. */
export function formatPassExpirationDate(expirationSeconds: number): string {
  return new Date(expirationSeconds * 1000).toISOString().split("T")[0];
}

export function passAccessUntilMessage(expirationSeconds: number): string {
  return `Your access runs until ${formatPassExpirationDate(expirationSeconds)}. No refund.`;
}
