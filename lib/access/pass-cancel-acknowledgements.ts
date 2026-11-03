const STORAGE_PREFIX = "crtv3:pass-cancel-ack:";

export function passCancelStorageKey(
  walletAddress: string,
  lockAddress: string,
  tokenId: string,
): string {
  return `${walletAddress.toLowerCase()}:${lockAddress.toLowerCase()}:${tokenId}`;
}

function storageKeyForWallet(walletAddress: string): string {
  return `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
}

export function readPassCancelAcknowledgements(walletAddress: string): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(storageKeyForWallet(walletAddress));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

export function writePassCancelAcknowledgements(
  walletAddress: string,
  keys: Set<string>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      storageKeyForWallet(walletAddress),
      JSON.stringify([...keys]),
    );
  } catch {
    // Ignore quota / private mode errors; in-memory state still applies for the session.
  }
}

export function addPassCancelAcknowledgement(
  walletAddress: string,
  passKey: string,
  existing: Set<string>,
): Set<string> {
  const next = new Set(existing);
  next.add(passKey);
  writePassCancelAcknowledgements(walletAddress, next);
  return next;
}
