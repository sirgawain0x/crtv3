import { NextRequest, NextResponse } from 'next/server';
import { fullLivepeer } from '@/lib/sdk/livepeer/fullClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assetId)) {
      return NextResponse.json(
        { error: 'Invalid asset ID format. Expected UUID format.' },
        { status: 400 }
      );
    }

    // Fetch asset from Livepeer (server-side, no CORS issues)
    const assetResponse = await fullLivepeer.asset.get(assetId);
    
    // Check if the response contains errors (Livepeer API format)
    if (assetResponse && 'errors' in assetResponse && Array.isArray(assetResponse.errors) && assetResponse.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Asset not found',
          details: assetResponse.errors 
        },
        { status: 404 }
      );
    }
    
    if (!assetResponse || !assetResponse.asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(assetResponse);
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    
    // Extract error message from Livepeer API response if available
    let errorMessage = 'Failed to fetch asset';
    if (error?.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.join(', ');
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error?.errors || undefined
      },
      { status: 500 }
    );
  }
}
