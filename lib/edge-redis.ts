import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_KV_REST_API_URL) {
  throw new Error('UPSTASH_REDIS_REST_KV_REST_API_URL is not defined');
}

if (!process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_KV_REST_API_TOKEN is not defined');
}

// Create Redis client using Upstash (Edge compatible)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
});

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const rateLimits = {
  default: { limit: 20, window: 60 }, // 20 requests per minute
  signup: { limit: 5, window: 60 }, // 5 signups per minute
  login: { limit: 10, window: 60 }, // 10 login attempts per minute
  password: { limit: 3, window: 300 }, // 3 password attempts per 5 minutes
};

export async function checkRateLimit(
  ip: string,
  endpoint = 'default',
): Promise<RateLimitResult> {
  const config =
    rateLimits[endpoint as keyof typeof rateLimits] || rateLimits.default;
  const { limit, window } = config;

  const key = `rl:${ip}:${endpoint}`;
  const now = Date.now();

  const results = await redis
    .multi()
    .incr(key)
    .pexpire(key, window * 1000)
    .exec();

  if (!results?.[0]) throw new Error('Failed to check rate limit');

  const currentCount = results[0] as number;
  const reset = now + window * 1000;

  return {
    success: currentCount <= limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    reset,
  };
}
