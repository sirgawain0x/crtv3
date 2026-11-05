/**
 * Partner deep-link hosts for Creator Stock Picks (Path B — external trading only).
 * Exact host or subdomain match; used for generated and validated URLs.
 */
export const CREATOR_STOCK_PICK_PARTNER_HOSTS = [
  "o1.exchange",
  "www.o1.exchange",
  "app.o1.exchange",
  "terminal.o1.exchange",
  "basestonk.io",
  "www.basestonk.io",
  "app.basestonk.io",
  "docs.basestonk.io",
] as const;

export type CreatorStockPickPartnerHost =
  (typeof CREATOR_STOCK_PICK_PARTNER_HOSTS)[number];

export function isAllowedCreatorStockPickPartnerHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  for (const allowed of CREATOR_STOCK_PICK_PARTNER_HOSTS) {
    if (host === allowed) {
      return true;
    }
    const suffix = `.${allowed}`;
    if (host.endsWith(suffix)) {
      const prefix = host.slice(0, -suffix.length);
      if (prefix.length > 0 && !prefix.includes("..")) {
        return true;
      }
    }
  }
  return false;
}
