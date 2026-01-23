import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { serverLogger } from '@/lib/utils/logger';

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
    serverLogger.error('Error fetching MeToken by ID:', error);
    
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
      
      // Check for invalid UUID format errors
      if (error.message.includes('invalid input syntax') || error.message.includes('UUID')) {
        return NextResponse.json(
          { 
            error: 'Invalid MeToken ID format',
            details: 'MeToken ID must be a valid UUID'
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch MeToken',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
