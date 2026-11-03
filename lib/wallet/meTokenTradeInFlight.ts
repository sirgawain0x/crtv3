const inFlightByToken = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();

function tokenKey(meTokenAddress: string): string {
  return meTokenAddress.toLowerCase();
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeMeTokenTradeInFlight(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isMeTokenTradeInFlight(meTokenAddress: string): boolean {
  return inFlightByToken.has(tokenKey(meTokenAddress));
}

/** Keeps trading disabled until this promise settles (including after trade_pending). */
export function registerMeTokenTradeInFlight(
  meTokenAddress: string,
  operation: Promise<unknown>,
): void {
  const key = tokenKey(meTokenAddress);
  inFlightByToken.set(key, operation);
  notifyListeners();
  void operation
    .finally(() => {
      if (inFlightByToken.get(key) === operation) {
        inFlightByToken.delete(key);
        notifyListeners();
      }
    })
    .catch(() => {});
}
