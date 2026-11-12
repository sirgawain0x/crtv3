import { isAllowedCreatorStockPickPartnerHost } from "@/lib/creator-stock-picks/partner-hosts";

export type PartnerUrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IPV6_LITERAL = /^\[[0-9a-f:]+\]$/i;

export function isIpLiteralHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (IPV4_LITERAL.test(host)) {
    return true;
  }
  if (IPV6_LITERAL.test(host)) {
    return true;
  }
  return false;
}

export function isBlockedPartnerHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "[::1]"
  );
}

/** Validates HTTPS partner deep-links (no credentials, no IP literals, allowlisted host). */
export function validateCreatorStockPickPartnerUrl(
  input: string,
): PartnerUrlValidationResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: false, error: "Partner URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Enter a valid HTTPS URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Partner URL must use HTTPS" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Partner URL must not include credentials" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    isBlockedPartnerHostname(hostname) ||
    isIpLiteralHostname(hostname) ||
    !isAllowedCreatorStockPickPartnerHost(hostname)
  ) {
    return { ok: false, error: "Partner URL host is not on the allowlist" };
  }

  if (parsed.hash && parsed.hash.length > 2048) {
    return { ok: false, error: "Partner URL is too long" };
  }

  return { ok: true, url: parsed.href };
}
