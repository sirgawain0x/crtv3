import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";
import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from 'next/server';
import {
  FrameWorksUploadsAssetsUnavailableError,
  requireVideoProviderForUploadsAndAssets,
} from '@/lib/video-provider';
import { LIVEPEER_NOT_CONFIGURED } from '@/lib/sdk/livepeer/studioAuth';
import { serverLogger } from '@/lib/utils/logger';
import { isVideoAssetId } from '@/lib/video-provider/asset-id';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const access = await requirePlatformApiAccess(request, { resource: 'video.asset' });
  if (!access.allowed) return access.response;

  try {
    const { assetId } = await params;

    if (!assetId) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        { error: 'Asset ID is required', code: 'ASSET_ID_REQUIRED' },
        { status: 400 },
      ), access);
    }

    if (!isVideoAssetId(assetId)) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        {
          error: 'Invalid asset ID format.',
          code: 'INVALID_ASSET_ID',
        },
        { status: 400 },
      ), access);
    }

    const provider = requireVideoProviderForUploadsAndAssets(
      "asset.[assetId].GET",
    );
    if (!provider.isConfigured()) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      ), access);
    }

    const assetResponse = (await provider.assets.getById(assetId)) as {
      errors?: string[];
      asset?: unknown;
    } | null;

    if (
      assetResponse &&
      typeof assetResponse === "object" &&
      'errors' in assetResponse &&
      Array.isArray(assetResponse.errors) &&
      assetResponse.errors.length > 0
    ) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        {
          error: 'Asset not found',
          details: assetResponse.errors,
          code: 'ASSET_NOT_FOUND',
        },
        { status: 404 },
      ), access);
    }

    if (!assetResponse || !assetResponse.asset) {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        { error: 'Asset not found', code: 'ASSET_NOT_FOUND' },
        { status: 404 },
      ), access);
    }

    return withPlatformApiPaymentHeaders(NextResponse.json(assetResponse), access);
  } catch (error: unknown) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: error.message }, { status: 503 }), access);
    }

    serverLogger.error('Error fetching asset:', error);

    const err = error as { errors?: string[]; message?: string };
    let errorMessage = 'Failed to fetch asset';
    if (err?.errors && Array.isArray(err.errors)) {
      errorMessage = err.errors.join(', ');
    } else if (err?.message) {
      errorMessage = err.message;
    }

    if (errorMessage === 'LIVEPEER_NOT_CONFIGURED') {
      return withPlatformApiPaymentHeaders(NextResponse.json(
        {
          error: 'Livepeer is not configured',
          code: LIVEPEER_NOT_CONFIGURED,
        },
        { status: 503 },
      ), access);
    }

    return withPlatformApiPaymentHeaders(NextResponse.json(
      {
        error: errorMessage,
        details: err?.errors || undefined,
        code: 'ASSET_FETCH_ERROR',
      },
      { status: 500 },
    ), access);
  }
}
