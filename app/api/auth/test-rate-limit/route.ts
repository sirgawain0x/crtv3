import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';

export const dynamic = 'force-dynamic';

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Initialize RateLimiterRedis
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 100, // Max 100 requests
  duration: 60, // Per 60 seconds
  keyPrefix: 'ratelimit',
});

export async function GET(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';

  try {
    // Connect to Redis if not already connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // Consume rate limit points for the IP
    const result = await rateLimiter.consume(ip);

    const headers = new Headers({
      'Cache-Control': 'no-store',
      'X-RateLimit-Limit': result.points.toString(),
      'X-RateLimit-Remaining': result.remainingPoints.toString(),
      'X-RateLimit-Reset': Math.ceil(result.msBeforeNext / 1000).toString(),
    });

    return NextResponse.json(
      { message: 'Rate limit test endpoint' },
      { headers },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      const headers = new Headers({
        'Cache-Control': 'no-store',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + 60).toString(),
      });

      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers,
        },
      );
    }

    // Log unexpected errors and allow request as fallback
    console.error('Rate limit check failed:', error);
    return NextResponse.json({ message: 'Rate limit test endpoint' });
  }
}

// Optional: Disconnect Redis client on process exit
process.on('SIGTERM', async () => {
  await redisClient.quit();
});