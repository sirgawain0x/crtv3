import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { formatEther } from 'viem';
import { serverLogger } from '@/lib/utils/logger';
import { resolveLiveMeTokenMarket } from '@/lib/metokens/resolveLiveMeTokenMarket';
import { dbMetokenTotalSupplyToWei } from '@/lib/utils/metoken-units';
import { toFiniteNumber } from '@/lib/metokens/units';

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  volume: number;
  tvl: number;
}

// GET /api/market/tokens/[address]/price-history - Get price history for a token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') as '7d' | '30d' | 'all' || '7d';
    const interval = searchParams.get('interval') as 'hour' | 'day' || 'hour';

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get MeToken info
    const { data: meToken, error: meTokenError } = await supabase
      .from('metokens')
      .select('id, address, total_supply, tvl, hub_id, created_at')
      .eq('address', address.toLowerCase())
      .single();

    if (meTokenError) {
      serverLogger.error('Error fetching MeToken:', meTokenError);
      // If it's a "not found" error, return 404
      if (meTokenError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Token not found' },
          { status: 404 }
        );
      }
      // Otherwise return 500
      return NextResponse.json(
        { error: 'Failed to fetch token information', details: meTokenError.message },
        { status: 500 }
      );
    }

    if (!meToken) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const isAllPeriod = period === 'all';
    let startDate: Date | null = null;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    let txQuery = supabase
      .from('metoken_transactions')
      .select('created_at, transaction_type, amount, collateral_amount')
      .eq('metoken_id', meToken.id);

    if (startDate) {
      txQuery = txQuery.gte('created_at', startDate.toISOString());
    }

    const { data: allTransactions, error: txError } = await txQuery.order(
      'created_at',
      { ascending: true }
    );

    const transactions = (allTransactions ?? []).filter(tx => {
      const time = new Date(tx.created_at).getTime();
      return ['mint', 'burn'].includes(tx.transaction_type) && Number.isFinite(time) && time <= now.getTime() && (!startDate || time >= startDate.getTime());
    });

    const liveMarket = await resolveLiveMeTokenMarket(
      meToken.address,
      meToken.hub_id ?? undefined
    );

    const currentTotalSupply =
      liveMarket?.totalSupplyWei ?? dbMetokenTotalSupplyToWei(meToken.total_supply);
    const currentTvl = liveMarket?.tvl ?? toFiniteNumber(meToken.tvl);
    const currentSupplyTokens = Number(formatEther(currentTotalSupply));

    const currentPrice =
      liveMarket?.price ??
      (currentTotalSupply > 0n
        ? currentTvl / parseFloat(formatEther(currentTotalSupply))
        : 0);

    serverLogger.debug('Final price values (DB + Chain fallback):', {
      address: meToken.address,
      dbSupply: meToken.total_supply,
      dbTvl: meToken.tvl,
      finalSupplyTokens: currentSupplyTokens,
      finalTvl: currentTvl,
      calculatedPrice: currentPrice,
    });

    if (txError) {
      serverLogger.error('Error fetching transactions:', txError);
      // Return empty history instead of error if query fails
      return NextResponse.json({
        data: [],
        token: {
          address: meToken.address,
          current_price: currentPrice,
          current_tvl: currentTvl,
        },
      });
    }

    // Group transactions by time interval
    const historyMap = new Map<string, {
      timestamp: number;
      prices: number[];
      volumes: number[];
      tvls: number[];
    }>();

    const currentTimestamp = Math.floor(now.getTime() / 1000);

    // Process transactions to build price history
    // Logic: We have the *Current* state (reliable) and the list of transactions in the period.
    // To find the *Start* state (at startDate), we must "reverse replay" the transactions from Current backwards.
    // Then we can forward replay to generate the points.

    let runningSupply = 0;
    let runningTvl = 0;

    // 1. Reverse Replay to find initial state.
    // All values are whole units: supply in MeTokens, TVL in hub-asset USD.
    let replaySupply = currentSupplyTokens;
    let replayTvl = currentTvl;

    // Sort descending for reverse replay
    const reverseTxs = [...(transactions || [])].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const tx of reverseTxs) {
      const amount = toFiniteNumber(tx.amount);
      const collateral = toFiniteNumber(tx.collateral_amount);
      const hasCollateral = tx.collateral_amount != null && tx.collateral_amount !== '' && Number.isFinite(Number(tx.collateral_amount));

      // Price at this moment (approximate using current replay state)
      const replayPrice = replaySupply > 0 ? replayTvl / replaySupply : 0;

      if (tx.transaction_type === 'mint') {
        // Undo Mint: Remove supply, remove collateral
        replaySupply -= amount;
        replayTvl -= collateral;
      } else if (tx.transaction_type === 'burn') {
        // Undo Burn: add the supply back and the collateral that was returned
        replaySupply += amount;
        replayTvl += hasCollateral ? collateral : amount * replayPrice;
      }
    }

    // Set initial running values (clamped to 0 to avoid precision errors causing negatives)
    runningSupply = replaySupply > 0 ? replaySupply : 0;
    runningTvl = replayTvl > 0 ? replayTvl : 0;

    // Snapshot the state at the start of the period BEFORE the forward replay
    // mutates the running values — this is the baseline for the period % gain.
    const startSupply = runningSupply;
    const startTvl = runningTvl;

    serverLogger.debug('Reverse Replay Result:', {
      currentSupply: currentSupplyTokens,
      currentTvl,
      startSupply: runningSupply,
      startTvl: runningTvl,
      txCount: transactions?.length
    });

    serverLogger.debug('Processing transactions (Forward):', {
      totalTxCount: transactions?.length || 0,
      firstTx: transactions?.[0],
      lastTx: transactions?.[transactions.length - 1],
    });

    for (const tx of transactions || []) {
      const txDate = new Date(tx.created_at);
      const txTimestamp = Math.floor(txDate.getTime() / 1000);

      // Determine time bucket key
      const bucketKey = interval === 'hour'
        ? txDate.toISOString().slice(0, 13) + ':00:00'
        : txDate.toISOString().slice(0, 10);

      // Calculate price BEFORE this transaction to estimate returned value for burns
      const preTxPrice = runningSupply > 0 ? runningTvl / runningSupply : 0;

      // Update running totals based on transaction type (whole units throughout)
      const amount = toFiniteNumber(tx.amount);
      const collateral = toFiniteNumber(tx.collateral_amount);
      const hasCollateral = tx.collateral_amount != null && tx.collateral_amount !== '' && Number.isFinite(Number(tx.collateral_amount));

      if (tx.transaction_type === 'mint') {
        runningSupply += amount;
        runningTvl += collateral;
      } else if (tx.transaction_type === 'burn') {
        // Use the value actually returned when we have it, otherwise value the
        // burn at the price just before it happened.
        const returned = hasCollateral ? collateral : amount * preTxPrice;
        runningSupply -= amount;
        runningTvl -= returned;
        if (runningTvl < 0) runningTvl = 0;
      }

      // Calculate price AFTER this transaction
      const price = runningSupply > 0 ? runningTvl / runningSupply : 0;

      // Get or create bucket
      if (!historyMap.has(bucketKey)) {
        historyMap.set(bucketKey, {
          timestamp: txTimestamp,
          prices: [],
          volumes: [],
          tvls: [],
        });
      }

      const bucket = historyMap.get(bucketKey)!;
      bucket.prices.push(price);
      bucket.tvls.push(runningTvl);
      bucket.volumes.push(hasCollateral ? collateral : tx.transaction_type === 'burn' ? amount * preTxPrice : 0);
    }

    // Convert map to array and aggregate by bucket
    const history: PriceHistoryPoint[] = [];

    // Sort buckets by timestamp
    const sortedBuckets = Array.from(historyMap.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (const [, bucket] of sortedBuckets) {
      // Calculate averages for the bucket
      const avgPrice = bucket.prices.length > 0
        ? bucket.prices.reduce((sum, p) => sum + p, 0) / bucket.prices.length
        : 0;
      const totalVolume = bucket.volumes.reduce((sum, v) => sum + v, 0);
      const avgTvl = bucket.tvls.length > 0
        ? bucket.tvls.reduce((sum, t) => sum + t, 0) / bucket.tvls.length
        : 0;

      history.push({
        timestamp: bucket.timestamp,
        price: avgPrice,
        volume: totalVolume,
        tvl: avgTvl,
      });
    }

    // The window baseline is a snapshot, not an average with trades in its bucket.
    if (!isAllPeriod && startDate) {
      history.unshift({ timestamp: Math.floor(startDate.getTime() / 1000),
        price: startSupply > 0 ? startTvl / startSupply : 0, volume: 0, tvl: startTvl });
    }
    const lastPoint = history[history.length - 1];
    if (!lastPoint || lastPoint.timestamp < currentTimestamp) {
      history.push({ timestamp: currentTimestamp, price: currentPrice, volume: 0, tvl: currentTvl });
    }

    return NextResponse.json({
      data: history,
      token: {
        address: meToken.address,
        current_price: currentPrice,
        current_tvl: currentTvl,
      },
    });
  } catch (error) {
    serverLogger.error('Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

