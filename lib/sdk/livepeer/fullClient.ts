import { Livepeer } from 'livepeer';
import { resolveLivepeerStudioAuthToken } from './studioAuth';

let cachedClient: Livepeer | null | undefined;

/** Lazily construct the Livepeer SDK client (full key, then LIVEPEER_API_KEY). */
export function getFullLivepeer(): Livepeer | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }
  const apiKey = resolveLivepeerStudioAuthToken();
  if (!apiKey) {
    cachedClient = null;
    return null;
  }
  cachedClient = new Livepeer({ apiKey });
  return cachedClient;
}

/** Backward-compatible accessor; throws if Livepeer is not configured. */
export const fullLivepeer = new Proxy({} as Livepeer, {
  get(_target, prop) {
    const client = getFullLivepeer();
    if (!client) {
      throw new Error('LIVEPEER_NOT_CONFIGURED');
    }
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
