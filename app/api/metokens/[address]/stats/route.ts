import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';

// GET /api/metokens/[address]/stats - Get MeToken statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    
    if (!address) {
      return NextResponse.json(
        { error: 'MeToken address is required' },
        { status: 400 }
      );
    }

    const stats = await meTokenSupabaseService.getMeTokenStats(address);
    
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Error fetching MeToken stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MeToken stats' },
      { status: 500 }
    );
  }
}
