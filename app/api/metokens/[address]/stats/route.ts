import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { serverLogger } from '@/lib/utils/logger';

// GET /api/metokens/[address]/stats - Get MeToken statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  let address: string | undefined;
  try {
    const resolvedParams = await params;
    address = resolvedParams.address;
    
    if (!address) {
      return NextResponse.json(
        { error: 'MeToken address is required' },
        { status: 400 }
      );
    }

    const stats = await meTokenSupabaseService.getMeTokenStats(address);
    
    return NextResponse.json({ data: stats });
  } catch (error) {
    serverLogger.error('Error fetching MeToken stats:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
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
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch MeToken stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
