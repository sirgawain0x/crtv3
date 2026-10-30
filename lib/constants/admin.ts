/** Wallet address allowed to see internal video status badges (ready/published). */
export const VIDEO_ADMIN_ADDRESS =
  "0xdE4b0371BBa20602685916ceeE5B22025a811734";

export function isVideoAdminAddress(
  address: string | null | undefined,
): boolean {
  if (!address) return false;
  return address.toLowerCase() === VIDEO_ADMIN_ADDRESS.toLowerCase();
}
