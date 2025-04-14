import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_KV_REST_API_URL) {
  throw new Error('UPSTASH_REDIS_REST_KV_REST_API_URL is not defined');
}

if (!process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_KV_REST_API_TOKEN is not defined');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
});

interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
}

const rateLimits: Record<string, RateLimitConfig> = {
  default: { limit: 20, window: 60 },
  signup: { limit: 5, window: 60 },
  login: { limit: 10, window: 60 },
  password: { limit: 3, window: 300 },
};

export async function rateLimit(
  ip: string,
  endpoint = 'default',
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const config = rateLimits[endpoint] || rateLimits.default;
  const { limit, window } = config;

  const key = `rl:${ip}:${endpoint}`;
  const now = Date.now();
  const clearBefore = now - window * 1000;

  const [value, timestamp] = (await redis.get<[number, number]>(key)) || [
    0,
    now,
  ];
  const currentCount = timestamp > clearBefore ? value + 1 : 1;

  await redis.set(key, [currentCount, now], {
    ex: window,
  });

  return {
    success: currentCount <= limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    reset: now + window * 1000,
  };
}
