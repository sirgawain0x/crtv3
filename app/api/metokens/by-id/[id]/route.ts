import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';

// GET /api/metokens/by-id/[id] - Get MeToken by UUID ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'MeToken ID is required' },
        { status: 400 }
      );
    }

    const meToken = await meTokenSupabaseService.getMeTokenById(id);
    
    if (!meToken) {
      return NextResponse.json(
        { error: 'MeToken not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: meToken });
  } catch (error) {
    console.error('Error fetching MeToken by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MeToken' },
      { status: 500 }
    );
  }
}
