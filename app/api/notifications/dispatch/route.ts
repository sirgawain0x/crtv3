import { NextRequest, NextResponse } from 'next/server';
import { dispatchPush } from '@/lib/notifications';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    // Verify the cron secret
    const secret = process.env.CRON_SECRET;
    if (
      !secret ||
      request.headers.get('authorization') !== `Bearer ${secret}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dispatchPush();

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Notification dispatch failed:', error);
    return NextResponse.json(
      { error: 'Dispatch failed' },
      { status: 500 }
    );
  }
}
