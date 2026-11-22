import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { serverLogger } from '@/lib/utils/logger';

// GET /api/metokens/[address]/stats - Get MeToken statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const access = await requirePlatformApiAccess(request, { resource: "metokens.stats" });
  if (!access.allowed) return access.response;

  let address: string | undefined;
  try {
    const resolvedParams = await params;
    address = resolvedParams.address;
    
    if (!address) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        { error: 'MeToken address is required' },
        { status: 400 }
      ), access);
    }

    const stats = await meTokenSupabaseService.getMeTokenStats(address);
    
    return withPlatformApiPaymentHeaders(NextResponse.json({ data: stats }), access);
  } catch (error) {
    serverLogger.error('Error fetching MeToken stats:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for database connection errors
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return withPlatformApiPaymentHeaders(NextResponse.json(
          { 
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again later.'
          },
          { status: 503 }
        ), access);
      }
      
      // Check for not found errors
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return withPlatformApiPaymentHeaders(NextResponse.json(
          { 
            error: 'MeToken not found',
            details: address ? `No MeToken found with address: ${address}` : 'MeToken not found'
          },
          { status: 404 }
        ), access);
      }
    }
    
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { 
        error: 'Failed to fetch MeToken stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    ), access);
  }
}
