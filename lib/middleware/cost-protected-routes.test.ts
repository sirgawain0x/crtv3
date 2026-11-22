import { describe, expect, it } from 'vitest';
import { isCostProtectedRoute, getCostProtectedRoute } from './cost-protected-routes';
describe('paid route matching', () => {
  it('covers public and internal playback aliases', () => {
    expect(isCostProtectedRoute('/api/internal/playback-info', 'GET')).toBe(true);
    expect(isCostProtectedRoute('/api/internal/sign-jwt', 'POST')).toBe(true);
    expect(isCostProtectedRoute('/api/livepeer/playback-info', 'GET')).toBe(true);
  });
  it('shares a rate bucket across token addresses', () => {
    const first = getCostProtectedRoute('/api/market/tokens/0xabc/fresh', 'GET');
    const second = getCostProtectedRoute('/api/market/tokens/0xdef/fresh', 'GET');
    expect(first?.path).toBe('/api/market/tokens/*/fresh');
    expect(second).toBe(first);
  });
  it('allows payment preflight without classifying machine webhooks as paid browser APIs', () => {
    expect(isCostProtectedRoute('/api/story/rpc-proxy', 'OPTIONS')).toBe(true);
    expect(isCostProtectedRoute('/api/livepeer/webhook', 'POST')).toBe(false);
    expect(isCostProtectedRoute('/api/metokens/indexer/cron', 'GET')).toBe(false);
    expect(isCostProtectedRoute('/api/market/tokens/0xabc/fresh/extra', 'GET')).toBe(false);
  });
});
