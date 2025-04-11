import { createClient } from 'redis';

// Create Redis client
const client = createClient({
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '18684'),
  },
});

client.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis (this is a promise we'll await when needed)
const redisConnect = client.connect();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface RateLimitConfig {
  limit: number;
  window: number;
}

// Rate limit configurations for different endpoints
const rateLimits: Record<string, RateLimitConfig> = {
  default: { limit: 20, window: 60 }, // 20 requests per minute
  signup: { limit: 5, window: 60 }, // 5 requests per minute
  login: { limit: 10, window: 60 }, // 10 requests per minute
  password: { limit: 3, window: 300 }, // 3 requests per 5 minutes
};

export async function checkRateLimit(
  ip: string,
  endpoint = 'default',
): Promise<RateLimitResult> {
  await redisConnect; // Ensure we're connected

  const config = rateLimits[endpoint] || rateLimits.default;
  const { limit, window } = config;
  const key = `ratelimit:${ip}:${endpoint}`;

  const now = Date.now();
  const clearBefore = now - window * 1000;

  // Get current data or create new entry
  const data = await client.hGetAll(key);
  const count = data.count ? parseInt(data.count) : 0;
  const timestamp = data.timestamp ? parseInt(data.timestamp) : now;

  // Reset if window has passed
  const currentCount = timestamp < clearBefore ? 1 : count + 1;
  const currentTimestamp = timestamp < clearBefore ? now : timestamp;

  // Update values
  await client.hSet(key, {
    count: currentCount.toString(),
    timestamp: currentTimestamp.toString(),
  });

  // Set expiration
  await client.expire(key, window);

  // Calculate reset time
  const reset = timestamp + window * 1000;

  return {
    success: currentCount <= limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    reset,
  };
}

export { client as redis };
