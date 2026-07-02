/** Song Cup admin wallets (submissions review + matchup curation). */
export const SONG_CUP_ADMIN_WALLETS = [
  "0xdE4b0371BBa20602685916ceeE5B22025a811734",
  /** creative.eth */
  "0xa7383918cbd43a73d2391a09fdd429b832b2e2f6",
] as const;

export function isSongCupAdminWallet(address: string | null | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return SONG_CUP_ADMIN_WALLETS.some((w) => w.toLowerCase() === normalized);
}

export function truncateWalletAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
