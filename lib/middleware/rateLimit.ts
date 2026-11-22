import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/utils/logger';
import { getCostProtectedRoute } from '@/lib/middleware/cost-protected-routes';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional: Custom key generator (defaults to IP address) */
  keyGenerator?: (request: NextRequest) => string;
  /** Optional: Custom error message */
  errorMessage?: string;
}

/**
 * Rate limit entry stored in memory
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store
 * In production with multiple instances, consider using Redis or a dedicated rate limiting service
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval - remove expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanupTime = Date.now();

/**
 * Remove expired entries from the rate limit store to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      entriesToDelete.push(key);
    }
  }

  entriesToDelete.forEach((key) => {
    rateLimitStore.delete(key);
  });

  if (entriesToDelete.length > 0) {
    serverLogger.debug(`Cleaned up ${entriesToDelete.length} expired rate limit entries`);
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP (in case of proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for development
  return '127.0.0.1';
}

/**
 * Check if request exceeds rate limit
 */
function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // Periodic cleanup: remove expired entries every 5 minutes
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    cleanupExpiredEntries();
    lastCleanupTime = now;
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/** Atomic shared window when Upstash REST is configured; no per-instance fallback on failure. */
async function checkSharedRateLimit(key: string, config: RateLimitConfig) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url && !token) {
    if (process.env.RATE_LIMIT_REQUIRE_SHARED_STORE === 'true') throw new Error('Shared rate limiter required');
    return checkRateLimit(key, config);
  }
  if (!url || !token || !url.startsWith('https://')) throw new Error('Shared rate limiter misconfigured');
  const script = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('PTTL', KEYS[1])}";
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['EVAL', script, '1', `crtv:rate:${key}`, String(config.windowMs)]),
    signal: AbortSignal.timeout(3000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Shared rate limiter unavailable');
  const payload = await response.json();
  const [count, ttl] = Array.isArray(payload.result) ? payload.result : [];
  if (payload.error || !Number.isInteger(count) || count < 1 || !Number.isInteger(ttl) || ttl < 0) {
    throw new Error('Invalid shared rate limit response');
  }
  return { allowed: count <= config.maxRequests, remaining: Math.max(0, config.maxRequests - count), resetTime: Date.now() + ttl };
}

/**
 * Rate limiting middleware for Next.js API routes
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await rateLimit(request, {
 *     maxRequests: 10,
 *     windowMs: 60 * 1000, // 1 minute
 *   });
 *   
 *   if (rateLimitResponse) {
 *     return rateLimitResponse; // Rate limit exceeded
 *   }
 *   
 *   // Continue with your handler logic
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : `${request.method}:${getCostProtectedRoute(request.nextUrl.pathname, request.method)?.path ?? request.nextUrl.pathname}:${config.maxRequests}:${config.windowMs}:${getClientIp(request)}`;

  let result;
  try {
    result = await checkSharedRateLimit(key, config);
  } catch {
    serverLogger.warn('Rate limiter unavailable');
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    serverLogger.warn(`Rate limit exceeded for ${key}`, {
      key,
      resetTime: new Date(result.resetTime).toISOString(),
    });

    return NextResponse.json(
      {
        error: config.errorMessage || 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Return null to indicate rate limit check passed
  // The handler should continue processing
  return null;
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** Strict rate limiter: 5 requests per minute */
  strict: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 5,
      windowMs: 60 * 1000,
      errorMessage: 'Too many requests. Please slow down.',
    }),

  /** Standard rate limiter: 10 requests per minute */
  standard: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 10,
      windowMs: 60 * 1000,
      errorMessage: 'Rate limit exceeded. Please try again later.',
    }),

  /** Generous rate limiter: 20 requests per minute */
  generous: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    }),

  /** Playback grids burst many IDs on one page view */
  playbackInfo: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: process.env.NODE_ENV === 'development' ? 200 : 100,
      windowMs: 60 * 1000,
      errorMessage: 'Too many playback info requests. Please try again shortly.',
    }),

  /**
   * View increments: namespaced by route so shared `standard` traffic cannot
   * exhaust this bucket (false 429s on legitimate plays).
   */
  viewIncrement: (request: NextRequest) =>
    rateLimit(request, {
      maxRequests: 30,
      windowMs: 60 * 1000,
      keyGenerator: (req) => `view-increment:${getClientIp(req)}`,
      errorMessage: 'Too many view increments. Please try again shortly.',
    }),

  /** API key-based rate limiter: 100 requests per minute */
  apiKey: (request: NextRequest, apiKey: string) =>
    rateLimit(request, {
      maxRequests: 100,
      windowMs: 60 * 1000,
      keyGenerator: () => `api-key:${apiKey}`,
    }),
};

