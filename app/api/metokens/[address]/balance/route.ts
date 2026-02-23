import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { serverLogger } from '@/lib/utils/logger';
import { rateLimiters } from '@/lib/middleware/rateLimit';

// PUT /api/metokens/[address]/balance - Update user's MeToken balance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let address: string | undefined;
  try {
    const resolvedParams = await params;
    address = resolvedParams.address;
    
    // Handle JSON parsing errors
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      serverLogger.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
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
      const missingFields = [];
      if (!user_address) missingFields.push('user_address');
      if (balance === undefined) missingFields.push('balance');
      
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
          hint: 'Both user_address and balance are required'
        },
        { status: 400 }
      );
    }
    
    // Validate balance is a valid number
    const balanceNum = typeof balance === 'string' ? parseFloat(balance) : Number(balance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      return NextResponse.json(
        { 
          error: 'Invalid balance',
          details: 'balance must be a non-negative number'
        },
        { status: 400 }
      );
    }
    
    // Validate user_address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(user_address)) {
      return NextResponse.json(
        { 
          error: 'Invalid user_address format',
          details: 'user_address must be a valid Ethereum address (0x followed by 40 hex characters)'
        },
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
    serverLogger.error('Error updating user balance:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for not found errors
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'MeToken not found',
            details: address ? `No MeToken found with address: ${address}` : 'MeToken not found'
          },
          { status: 404 }
        );
      }
      
      // Check for database connection errors
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again later.'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update user balance',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

