import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';

// GET /api/metokens/[address]/transactions - Get MeToken transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userAddress = searchParams.get('userAddress');
    
    if (!address) {
      return NextResponse.json(
        { error: 'MeToken address is required' },
        { status: 400 }
      );
    }

    const transactions = await meTokenSupabaseService.getMeTokenTransactions(address, {
      limit,
      offset,
      userAddress: userAddress || undefined,
    });

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error('Error fetching MeToken transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/metokens/[address]/transactions - Record a new transaction
export async function POST(
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
      transaction_type,
      amount,
      collateral_amount,
      transaction_hash,
      block_number,
    } = body;

    // Validate required fields
    if (!user_address || !transaction_type || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the MeToken to get its ID
    const meToken = await meTokenSupabaseService.getMeTokenByAddress(address);
    if (!meToken) {
      return NextResponse.json(
        { error: 'MeToken not found' },
        { status: 404 }
      );
    }

    const transactionData = {
      metoken_id: meToken.id,
      user_address,
      transaction_type,
      amount,
      collateral_amount,
      transaction_hash,
      block_number,
    };

    const result = await meTokenSupabaseService.recordTransaction(transactionData);
    
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('Error recording transaction:', error);
    return NextResponse.json(
      { error: 'Failed to record transaction' },
      { status: 500 }
    );
  }
}
