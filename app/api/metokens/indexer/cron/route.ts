import { NextRequest, NextResponse } from 'next/server';
import { indexMeTokenTrades, DEFAULT_LOOKBACK_BLOCKS, MAX_INDEX_BLOCKS } from '@/lib/metokens/tradeIndexer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Disabled until a separately reviewed rollout enables chain-owned trade writes. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'Cron authentication is not configured' }, { status: 503 });
  if (request.headers.get('authorization') !== 'Bearer ' + secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (process.env.METOKEN_TRADE_INDEXER_ENABLED !== 'true') return NextResponse.json({ error: 'Trade indexing is disabled' }, { status: 503 });
  const params = request.nextUrl.searchParams;
  const lookbackBlocks = params.has('lookback') ? Number(params.get('lookback')) : DEFAULT_LOOKBACK_BLOCKS;
  const fromBlock = params.has('fromBlock') ? Number(params.get('fromBlock')) : undefined;
  const toBlock = params.has('toBlock') ? Number(params.get('toBlock')) : undefined;
  const valid = (value: number | undefined) => value == null || (Number.isSafeInteger(value) && value >= 0);
  if (!valid(fromBlock) || !valid(toBlock) || !Number.isSafeInteger(lookbackBlocks) || lookbackBlocks <= 0 || lookbackBlocks > MAX_INDEX_BLOCKS
    || ['lookback', 'fromBlock', 'toBlock'].some(key => params.has(key) && !params.get(key)?.trim())) return NextResponse.json({ error: 'Invalid or oversized block window' }, { status: 400 });
  try {
    const dryRun = params.get('dryRun') === 'true';
    const result = await indexMeTokenTrades({ lookbackBlocks, fromBlock, toBlock, dryRun });
    return NextResponse.json({ success: result.errors.length === 0, dryRun, ...result }, { status: result.errors.length ? 502 : 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Trade index failed; no incomplete log window is treated as complete' }, { status: 502 });
  }
}
