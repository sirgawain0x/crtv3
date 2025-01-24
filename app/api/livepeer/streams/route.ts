import { Livepeer } from 'livepeer';
import { NextResponse } from 'next/server';

const livepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_FULL_API_KEY,
});

export async function GET() {
  try {
    const streams = await livepeer.stream.getAll();
    return NextResponse.json(streams);
  } catch (error) {
    console.error('Error fetching streams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}
