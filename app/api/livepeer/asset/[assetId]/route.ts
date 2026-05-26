import { NextRequest, NextResponse } from 'next/server';
import { getFullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import { LIVEPEER_NOT_CONFIGURED } from '@/lib/sdk/livepeer/studioAuth';
import { serverLogger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required', code: 'ASSET_ID_REQUIRED' },
        { status: 400 },
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assetId)) {
      return NextResponse.json(
        {
          error: 'Invalid asset ID format. Expected UUID format.',
          code: 'INVALID_ASSET_ID',
        },
        { status: 400 },
      );
    }

    const client = getFullLivepeer();
    if (!client) {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      );
    }

    const assetResponse = await client.asset.get(assetId);

    if (
      assetResponse &&
      'errors' in assetResponse &&
      Array.isArray(assetResponse.errors) &&
      assetResponse.errors.length > 0
    ) {
      return NextResponse.json(
        {
          error: 'Asset not found',
          details: assetResponse.errors,
          code: 'ASSET_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    if (!assetResponse || !assetResponse.asset) {
      return NextResponse.json(
        { error: 'Asset not found', code: 'ASSET_NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json(assetResponse);
  } catch (error: unknown) {
    serverLogger.error('Error fetching asset:', error);

    const err = error as { errors?: string[]; message?: string };
    let errorMessage = 'Failed to fetch asset';
    if (err?.errors && Array.isArray(err.errors)) {
      errorMessage = err.errors.join(', ');
    } else if (err?.message) {
      errorMessage = err.message;
    }

    if (errorMessage === 'LIVEPEER_NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: err?.errors || undefined,
        code: 'ASSET_FETCH_ERROR',
      },
      { status: 500 },
    );
  }
}
