import { createClient } from 'redis';

const isDevelopment = process.env.NODE_ENV === 'development';

// Development configuration with minimal memory usage
const developmentConfig = {
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '18684'),
  },
  // Development-specific configurations
  maxRetriesPerRequest: 1,
  commandsQueueMaxLength: 1000,
  disableOfflineQueue: true,
};

// Production configuration optimized for performance and reliability
const productionConfig = {
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '18684'),
    connectTimeout: 10000,
    reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
  },
  maxRetriesPerRequest: 3,
  commandsQueueMaxLength: 5000,
};

// Create Redis client with environment-specific configuration
const client = createClient(
  isDevelopment ? developmentConfig : productionConfig,
);

// Improved error handling with environment-specific logging
client.on('error', (err) => {
  if (isDevelopment) {
    console.error('Redis Development Error:', err);
  } else {
    // In production, you might want to use a proper logging service
    console.error('Redis Production Error:', err);
    // TODO: Add your production error logging service here
  }
});

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

// Rate limit configurations with environment-specific settings
const rateLimits: Record<string, RateLimitConfig> = {
  default: isDevelopment
    ? { limit: 1000, window: 60 } // More lenient in development
    : { limit: 20, window: 60 }, // Stricter in production
  signup: isDevelopment ? { limit: 50, window: 60 } : { limit: 5, window: 60 },
  login: isDevelopment ? { limit: 100, window: 60 } : { limit: 10, window: 60 },
  password: isDevelopment
    ? { limit: 30, window: 300 }
    : { limit: 3, window: 300 },
};

// Optimized rate limit check with memory-efficient storage
export async function checkRateLimit(
  ip: string,
  endpoint = 'default',
): Promise<RateLimitResult> {
  await redisConnect; // Ensure we're connected

  const config = rateLimits[endpoint] || rateLimits.default;
  const { limit, window } = config;

  // Shorter key names to reduce memory usage
  const key = `rl:${ip}:${endpoint}`;
  const now = Date.now();

  // Use string instead of hash to reduce memory usage
  const data = await client.get(key);
  let currentCount = 1;
  let currentTimestamp = now;

  if (data) {
    const [count, timestamp] = data.split(':').map(Number);
    const clearBefore = now - window * 1000;

    if (timestamp >= clearBefore) {
      currentCount = count + 1;
      currentTimestamp = timestamp;
    }
  }

  // Store data as string with automatic expiration
  await client.setEx(key, window, `${currentCount}:${currentTimestamp}`);

  return {
    success: currentCount <= limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    reset: currentTimestamp + window * 1000,
  };
}

// Memory monitoring utility
export async function getRedisMemoryInfo() {
  await redisConnect;
  return client.info('memory');
}

// Cleanup utility - use carefully in production
export async function cleanupStaleRateLimits() {
  if (!isDevelopment) {
    console.warn('Cleanup should be scheduled carefully in production');
    return;
  }

  await redisConnect;
  const keys = await client.keys('rl:*');
  let cleaned = 0;

  for (const key of keys) {
    const ttl = await client.ttl(key);
    if (ttl <= 0) {
      await client.del(key);
      cleaned++;
    }
  }

  return { cleaned };
}

export { client as redis };
