import { Livepeer } from 'livepeer';
import { NextResponse } from 'next/server';

const livepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_FULL_API_KEY,
});

export async function GET() {
  try {
    const streams = await livepeer.stream.getAll();
    
    // Filter for active streams and include relevant information
    const activeStreams = streams.data?.filter((stream) => {
      return stream.isActive === true;
    });

    return NextResponse.json({
      data: activeStreams,
      total: activeStreams?.length || 0,
      hasActive: (activeStreams?.length || 0) > 0
    });
  } catch (error) {
    console.error('Error fetching streams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}
