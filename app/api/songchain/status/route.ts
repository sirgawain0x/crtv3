import { getSongchainConfig } from '@/lib/songchain/config';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { enabled } = getSongchainConfig();
  return NextResponse.json({ enabled });
}
