import type { AuthHeaders } from "./useWalletAuth";

// Browser memory only. Never persist signatures in storage or cookies.
let owner = "";
let generation = 0;
let revision = 0;
let cached: { headers: AuthHeaders; expiresAt: number } | null = null;
let pending: Promise<AuthHeaders> | null = null;
const listeners = new Set<() => void>();

function notify() {
  revision++;
  listeners.forEach((listener) => listener());
}

export function subscribeWalletAuth(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function walletAuthRevision() { return revision; }

export function clearWalletAuth() {
  generation++;
  cached = null;
  pending = null;
  notify();
}

export function setWalletAuthOwner(address: string) {
  if (owner === address) return;
  owner = address;
  clearWalletAuth();
}

export function cachedWalletAuth(address: string): AuthHeaders | null {
  if (!address || owner !== address || !cached || cached.expiresAt <= Date.now()) return null;
  return { ...cached.headers };
}

export function requestWalletAuth(
  address: string,
  sign: (message: string) => Promise<string>,
): Promise<AuthHeaders> {
  if (!address || owner !== address) return Promise.reject(new Error("Wallet not connected"));
  const headers = cachedWalletAuth(address);
  if (headers) return Promise.resolve(headers);
  if (pending) return pending;
  const requestGeneration = generation;
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `Authorize Creative TV request for address ${address} at ${timestamp}`;
  const request = Promise.resolve().then(() => {
    if (generation !== requestGeneration || owner !== address) {
      throw new Error("The connected account changed. Please retry.");
    }
    return sign(message);
  }).then((signature) => {
    if (generation !== requestGeneration || owner !== address) {
      throw new Error("The connected account changed. Please retry.");
    }
    const headers: AuthHeaders = {
      "X-Wallet-Address": address,
      "X-Wallet-Timestamp": String(timestamp),
      "X-Wallet-Signature": signature,
    };
    const expiresAt = timestamp * 1000 + 4 * 60 * 1000;
    if (expiresAt <= Date.now()) throw new Error("Verification expired. Please retry.");
    cached = { headers, expiresAt };
    notify();
    return { ...headers };
  }).finally(() => {
    if (pending === request) pending = null;
  });
  pending = request;
  return request;
}
