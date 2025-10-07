import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';

// GET /api/metokens/[address] - Get specific MeToken
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

    const meToken = await meTokenSupabaseService.getMeTokenByAddress(address);
    
    if (!meToken) {
      return NextResponse.json(
        { error: 'MeToken not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: meToken });
  } catch (error) {
    console.error('Error fetching MeToken:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MeToken' },
      { status: 500 }
    );
  }
}

// PUT /api/metokens/[address] - Update MeToken data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const body = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'MeToken address is required' },
        { status: 400 }
      );
    }

    const updateData = {
      total_supply: body.total_supply,
      tvl: body.tvl,
      balance_pooled: body.balance_pooled,
      balance_locked: body.balance_locked,
      end_time: body.end_time,
      end_cooldown: body.end_cooldown,
    };

    const result = await meTokenSupabaseService.updateMeToken(address, updateData);
    
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error updating MeToken:', error);
    return NextResponse.json(
      { error: 'Failed to update MeToken' },
      { status: 500 }
    );
  }
}
