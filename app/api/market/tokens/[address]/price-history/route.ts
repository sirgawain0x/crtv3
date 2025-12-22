import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { formatEther } from 'viem';

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
      .select('id, address, total_supply, tvl')
      .eq('address', address.toLowerCase())
      .single();

    if (meTokenError) {
      console.error('Error fetching MeToken:', meTokenError);
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

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch transactions for this token
    const { data: transactions, error: txError } = await supabase
      .from('metoken_transactions')
      .select('created_at, transaction_type, amount, collateral_amount, me_tokens_minted, assets_returned')
      .eq('metoken_id', meToken.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Calculate current price for fallback response
    const currentTotalSupply = BigInt(meToken.total_supply || 0);
    const currentPrice = currentTotalSupply > 0 
      ? meToken.tvl / parseFloat(formatEther(currentTotalSupply))
      : 0;

    if (txError) {
      console.error('Error fetching transactions:', txError);
      // Return empty history instead of error if query fails
      return NextResponse.json({
        data: [],
        token: {
          address: meToken.address,
          current_price: currentPrice,
          current_tvl: meToken.tvl,
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
    const currentKey = interval === 'hour'
      ? new Date(currentTimestamp * 1000).toISOString().slice(0, 13) + ':00:00'
      : new Date(currentTimestamp * 1000).toISOString().slice(0, 10);

    // Process transactions to build price history
    let runningSupply = BigInt(0);
    let runningTvl = 0;

    for (const tx of transactions || []) {
      const txDate = new Date(tx.created_at);
      const txTimestamp = Math.floor(txDate.getTime() / 1000);
      
      // Determine time bucket key
      const bucketKey = interval === 'hour'
        ? txDate.toISOString().slice(0, 13) + ':00:00'
        : txDate.toISOString().slice(0, 10);

      // Update running totals based on transaction type
      if (tx.transaction_type === 'mint') {
        const minted = tx.me_tokens_minted 
          ? BigInt(tx.me_tokens_minted.toString())
          : BigInt(0);
        const collateral = parseFloat(tx.collateral_amount?.toString() || tx.amount?.toString() || '0');
        runningSupply += minted;
        runningTvl += collateral;
      } else if (tx.transaction_type === 'burn') {
        const burned = BigInt(tx.amount?.toString() || '0');
        const returned = parseFloat(tx.assets_returned?.toString() || '0');
        runningSupply -= burned;
        runningTvl -= returned;
      }

      // Calculate price at this point
      const price = runningSupply > 0 
        ? runningTvl / parseFloat(formatEther(runningSupply))
        : 0;

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
      
      // Calculate volume for this transaction
      const volume = tx.transaction_type === 'mint'
        ? parseFloat(tx.collateral_amount?.toString() || tx.amount?.toString() || '0')
        : parseFloat(tx.assets_returned?.toString() || '0');
      bucket.volumes.push(volume);
    }

    // Convert map to array and aggregate by bucket
    const history: PriceHistoryPoint[] = [];

    // Sort buckets by timestamp
    const sortedBuckets = Array.from(historyMap.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (const [key, bucket] of sortedBuckets) {
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

    // Add current point if not already included
    const lastPoint = history[history.length - 1];
    if (!lastPoint || lastPoint.timestamp < currentTimestamp - 3600) {
      history.push({
        timestamp: currentTimestamp,
        price: currentPrice,
        volume: 0,
        tvl: meToken.tvl,
      });
    }

    return NextResponse.json({
      data: history,
      token: {
        address: meToken.address,
        current_price: currentPrice,
        current_tvl: meToken.tvl,
      },
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

