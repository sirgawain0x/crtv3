const STORAGE_PREFIX = "crtv3:pass-cancel-ack:";

export function passCancelStorageKey(
  walletAddress: string,
  lockAddress: string,
  tokenId: string,
  expirationSeconds: number,
): string {
  return `${walletAddress.toLowerCase()}:${lockAddress.toLowerCase()}:${tokenId}:${expirationSeconds}`;
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
    return new Set(
      parsed.filter((entry): entry is string => {
        if (typeof entry !== "string") return false;
        // Require expiration segment so renewals with the same tokenId get a fresh key.
        return entry.split(":").length >= 4;
      }),
    );
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

export function prunePassCancelAcknowledgements(
  walletAddress: string,
  activePassKeys: ReadonlySet<string>,
): Set<string> {
  const stored = readPassCancelAcknowledgements(walletAddress);
  if (activePassKeys.size === 0) {
    return stored;
  }
  const pruned = new Set([...stored].filter((key) => activePassKeys.has(key)));
  if (pruned.size !== stored.size) {
    writePassCancelAcknowledgements(walletAddress, pruned);
  }
  return pruned;
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

export function buildActivePassCancelKeys(
  walletAddress: string,
  passes: ReadonlyArray<{
    address: string;
    tokenId?: string | null;
    expiration?: number;
  }>,
): Set<string> {
  const keys = new Set<string>();
  for (const pass of passes) {
    if (!pass.tokenId || pass.expiration == null) continue;
    keys.add(
      passCancelStorageKey(walletAddress, pass.address, pass.tokenId, pass.expiration),
    );
  }
  return keys;
}
