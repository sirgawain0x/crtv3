import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await checkRateLimit(ip);

  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers,
      },
    );
  }

  return NextResponse.json(
    { message: 'Rate limit test endpoint' },
    { headers },
  );
}
