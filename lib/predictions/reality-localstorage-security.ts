/**
 * One-time cleanup of reality.eth dapp localStorage keys on the Creative TV origin.
 * Upstream reality.eth cleared all storage after stored-XSS could poison RPC/indexer URLs;
 * we only remove reality-prefixed keys so unrelated app state (uploads, XMTP, etc.) is kept.
 */
const MIGRATION_KEY = "crtv.reality.storage.security.v1";

const REALITY_KEY_PREFIXES = ["reality.", "reality-eth-"];

function isRealityStorageKey(key: string): boolean {
  return REALITY_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function deleteRealityLocalStorageKeys(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isRealityStorageKey(key)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

function deleteRealityIndexedDb(): void {
  try {
    indexedDB.deleteDatabase("reality-eth-events");
  } catch {
    // ignore
  }
}

export function runRealityLocalStorageSecurityMigration(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATION_KEY) === "1") return;
    deleteRealityLocalStorageKeys();
    deleteRealityIndexedDb();
    localStorage.setItem(MIGRATION_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
