import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rateLimit } from './rateLimit';

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-secret');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('shared rate limits', () => {
  const request = new NextRequest('https://tv.creativeplatform.xyz/api/membership');
  const config = { maxRequests: 2, windowMs: 60_000 };
  it('blocks exhausted shared counters before upstream work', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ result: [3, 10_000] })));
    const result = await rateLimit(request, config);
    expect(result?.status).toBe(429);
    expect(result?.headers.get('Retry-After')).toBe('10');
  });
  it('fails closed if the configured store is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await rateLimit(request, config))?.status).toBe(503);
  });
  it('fails closed if shared storage is required but missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('RATE_LIMIT_REQUIRE_SHARED_STORE', 'true');
    expect((await rateLimit(request, config))?.status).toBe(503);
  });
  it('namespaces default limits by route instead of exhausting unrelated routes', async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json({ result: [1, 60_000] }));
    vi.stubGlobal('fetch', fetch);
    expect(await rateLimit(request, config)).toBeNull();
    expect(await rateLimit(new NextRequest('https://tv.creativeplatform.xyz/api/market/tokens'), config)).toBeNull();
    const keys = fetch.mock.calls.map(([, options]) => JSON.parse(options.body)[3]);
    expect(keys[0]).not.toBe(keys[1]);
  });
});
