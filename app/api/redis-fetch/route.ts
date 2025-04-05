import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
});

export const POST = async () => {
  try {
    // Fetch data from Redis
    const result = await redis.get('item');

    // Return the result in the response
    return new NextResponse(JSON.stringify({ result }), { status: 200 });
  } catch (error) {
    // Handle errors gracefully
    console.error('Error fetching data from Redis:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
    });
  }
};
