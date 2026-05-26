import { NextRequest, NextResponse } from 'next/server';
import { getFullLivepeer } from '@/lib/sdk/livepeer/fullClient';
import {
  LIVEPEER_AUTH_FAILED,
  LIVEPEER_NOT_CONFIGURED,
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from '@/lib/sdk/livepeer/studioAuth';
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

    const token = resolveLivepeerStudioAuthToken();
    if (!token) {
      return NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      );
    }

    const client = getFullLivepeer();
    if (client) {
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
    }

    const base = livepeerStudioApiBaseUrl();
    const livepeerRes = await fetch(
      `${base}/api/asset/${encodeURIComponent(assetId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    if (livepeerRes.status === 401 || livepeerRes.status === 403) {
      return NextResponse.json(
        {
          error: 'Livepeer authentication failed',
          code: LIVEPEER_AUTH_FAILED,
        },
        { status: 502 },
      );
    }

    if (!livepeerRes.ok) {
      return NextResponse.json(
        {
          error: 'Asset not found',
          code: livepeerRes.status === 404 ? 'ASSET_NOT_FOUND' : 'LIVEPEER_UPSTREAM_ERROR',
        },
        { status: livepeerRes.status >= 500 ? 502 : livepeerRes.status },
      );
    }

    return NextResponse.json(await livepeerRes.json());
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
