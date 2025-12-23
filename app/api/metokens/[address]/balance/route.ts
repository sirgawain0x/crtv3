import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';

// PUT /api/metokens/[address]/balance - Update user's MeToken balance
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

    const {
      user_address,
      balance,
    } = body;

    // Validate required fields
    if (!user_address || balance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: user_address and balance are required' },
        { status: 400 }
      );
    }

    const result = await meTokenSupabaseService.updateUserBalance(
      address,
      user_address,
      balance
    );
    
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Error updating user balance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user balance' },
      { status: 500 }
    );
  }
}

