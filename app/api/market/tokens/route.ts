import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { formatEther } from 'viem';
import { getMeTokenProtocolInfo, getMeTokenInfoFromBlockchain, getBulkMeTokenInfo } from '@/lib/utils/metokenUtils';
import { serverLogger } from '@/lib/utils/logger';

export interface MarketToken {
  id: string;
  address: string;
  name: string;
  symbol: string;
  owner_address: string;
  type: 'metoken' | 'content_coin';
  price: number;
  tvl: number;
  total_supply: string;
  market_cap: number;
  price_change_24h?: number;
  volume_24h?: number;
  created_at: string;
  // Content Coin specific fields
  video_id?: number;
  video_title?: string;
  playback_id?: string;
  thumbnail_url?: string;
  // Creator info
  creator_username?: string;
  creator_avatar_url?: string;
}

export interface MarketStats {
  total_tokens: number;
  total_tvl: number;
  volume_24h: number;
  top_gainers: MarketToken[];
  top_losers: MarketToken[];
}

// GET /api/market/tokens - Get market tokens with filtering and sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters
    const type = searchParams.get('type') as 'all' | 'metoken' | 'content_coin' | null;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') as 'price' | 'tvl' | 'market_cap' | 'volume_24h' | 'price_change_24h' | 'created_at' || 'tvl';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeStats = searchParams.get('includeStats') === 'true';
    // Only fetch fresh data from blockchain if explicitly requested (disabled by default for performance)
    // Background cron job keeps Supabase data fresh
    const useFreshData = searchParams.get('fresh') === 'true';

    const supabase = await createClient();

    // Fetch MeTokens
    const meTokenOptions = {
      limit: type === 'content_coin' ? 0 : 1000, // Get all if not filtering to content coins only
      offset: 0,
      sortBy: 'tvl' as const,
      sortOrder: 'desc' as const,
      search: search || undefined,
    };

    let meTokens = type === 'content_coin' ? [] : await meTokenSupabaseService.getAllMeTokens(meTokenOptions);

    // If Supabase has very few tokens, try to sync from subgraph (similar to profile page)
    // This ensures the market shows data even if Supabase hasn't been fully synced yet
    if (type !== 'content_coin' && meTokens.length < 5 && !search) {
      try {
        serverLogger.debug('Market API: Supabase has few tokens, checking subgraph for sync...');

        // Use the proxy endpoint which has better error handling and fallback logic
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const subgraphEndpoint = `${baseUrl}/api/metokens-subgraph`;

        const GET_ALL_SUBSCRIBES = `
          query GetAllSubscribes($first: Int = 100, $skip: Int = 0) {
            subscribes(first: $first, skip: $skip, orderBy: id, orderDirection: desc) {
              id
              meToken
              hubId
              assetsDeposited
            }
          }
        `;

        // Use fetch instead of graphql-request to go through the proxy
        const subgraphResponse = await fetch(subgraphEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: GET_ALL_SUBSCRIBES,
            variables: { first: 50, skip: 0 },
          }),
        });

        if (!subgraphResponse.ok) {
          const errorText = await subgraphResponse.text();
          serverLogger.warn('Market API: Subgraph sync failed (non-critical):', {
            status: subgraphResponse.status,
            error: errorText,
          });
          // Continue with existing Supabase data - this is a fallback, not critical
        } else {
          const subgraphData = await subgraphResponse.json() as any;
          
          // Check for GraphQL errors in response
          if (subgraphData.errors && subgraphData.errors.length > 0) {
            serverLogger.warn('Market API: GraphQL errors in subgraph response:', subgraphData.errors);
            // Continue with existing Supabase data
          } else {
            const subscribeEvents = subgraphData?.data?.subscribes || [];

            if (subscribeEvents.length > 0) {
              serverLogger.debug(`Found ${subscribeEvents.length} MeTokens in subgraph, syncing recent ones...`);

              // Sync the most recent tokens from subgraph to Supabase
              // Limit to 10 to avoid timeout
              for (const event of subscribeEvents.slice(0, 10)) {
                try {
                  const meTokenAddress = event.meToken;

                  // Check if already in Supabase
                  const existing = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);
                  if (existing) continue; // Skip if already synced

                  // Sync from subgraph to Supabase using internal API call
                  // Use absolute URL for server-side fetch
                  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

                  const syncResponse = await fetch(`${baseUrl}/api/metokens/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meTokenAddress })
                  });

                  if (syncResponse.ok) {
                    serverLogger.debug(`Synced MeToken: ${meTokenAddress}`);
                  }
                } catch (syncErr) {
                  serverLogger.warn(`Failed to sync MeToken ${event.meToken}:`, syncErr);
                  // Continue with other tokens even if one fails
                }
              }

              // Re-fetch from Supabase after syncing
              meTokens = await meTokenSupabaseService.getAllMeTokens(meTokenOptions);
              serverLogger.debug(`After sync, found ${meTokens.length} MeTokens in Supabase`);
            }
          }
        }
      } catch (subgraphErr) {
        serverLogger.warn('Market API: Subgraph sync failed (non-critical):', subgraphErr);
        // Continue with existing Supabase data - this is a fallback, not critical
      }
    }

    // Fetch Content Coins (MeTokens that are referenced in video_assets)
    let contentCoins: any[] = [];
    if (type !== 'metoken') {
      const { data: videoAssets, error: videoError } = await supabase
        .from('video_assets')
        .select(`
          id,
          title,
          playback_id,
          thumbnail_url,
          attributes,
          creator_id,
          created_at
        `)
        .not('attributes->content_coin_id', 'is', null)
        .eq('status', 'published');

      if (!videoError && videoAssets) {
        // Get unique content coin addresses
        const contentCoinAddresses = new Set<string>();
        const videoMap = new Map<string, any>();

        for (const video of videoAssets) {
          const contentCoinId = video.attributes?.content_coin_id;
          if (contentCoinId) {
            contentCoinAddresses.add(contentCoinId);
            videoMap.set(contentCoinId, video);
          }
        }

        // Fetch MeToken data for content coins
        if (contentCoinAddresses.size > 0) {
          const { data: contentCoinTokens, error: tokenError } = await supabase
            .from('metokens')
            .select('*')
            .in('address', Array.from(contentCoinAddresses));

          if (!tokenError && contentCoinTokens) {
            contentCoins = contentCoinTokens.map((token) => {
              const video = videoMap.get(token.address);
              return {
                ...token,
                video_id: video?.id,
                video_title: video?.title,
                playback_id: video?.playback_id,
                thumbnail_url: video?.thumbnail_url,
              };
            });
          }
        }
      }
    }

    // Combine and transform tokens
    let allTokens: MarketToken[] = [];

    // Transform MeTokens with Supabase data first
    for (const meToken of meTokens) {
      allTokens.push({
        id: meToken.id,
        address: meToken.address,
        name: meToken.name,
        symbol: meToken.symbol,
        owner_address: meToken.owner_address,
        type: 'metoken' as const,
        price: 0, // Will update below
        tvl: meToken.tvl,
        total_supply: meToken.total_supply?.toString() || '0',
        market_cap: meToken.tvl,
        created_at: meToken.created_at,
      });
    }

    // Transform Content Coins with Supabase data first
    for (const contentCoin of contentCoins) {
      allTokens.push({
        id: contentCoin.id,
        address: contentCoin.address,
        name: contentCoin.name,
        symbol: contentCoin.symbol,
        owner_address: contentCoin.owner_address,
        type: 'content_coin' as const,
        price: 0, // Will update below
        tvl: contentCoin.tvl,
        total_supply: contentCoin.total_supply?.toString() || '0',
        market_cap: contentCoin.tvl,
        video_id: contentCoin.video_id,
        video_title: contentCoin.video_title,
        playback_id: contentCoin.playback_id,
        thumbnail_url: contentCoin.thumbnail_url,
        created_at: contentCoin.created_at,
      });
    }

    // Identify tokens that need fresh data
    const tokensToRefresh = allTokens.filter(t => useFreshData || t.total_supply === '0' || t.tvl === 0);

    // Refresh data if needed
    if (tokensToRefresh.length > 0) {
      const addresses = tokensToRefresh.map(t => t.address);
      const bulkData = await getBulkMeTokenInfo(addresses);

      // Update tokens with fresh data and calculate prices
      allTokens = allTokens.map(token => {
        const fresh = bulkData[token.address];

        if (fresh) {
          return {
            ...token,
            tvl: fresh.tvl,
            price: fresh.price,
            total_supply: fresh.totalSupply,
            market_cap: fresh.tvl
          };
        }

        // If no fresh data found (or not successfully fetched), fall back to calculating price from existing data
        const totalSupply = BigInt(token.total_supply || 0);
        const price = totalSupply > 0n ? token.tvl / parseFloat(formatEther(totalSupply)) : 0;

        return {
          ...token,
          price
        };
      });
    } else {
      // Just calculate prices for all tokens based on Supabase data
      allTokens = allTokens.map(token => {
        const totalSupply = BigInt(token.total_supply || 0);
        const price = totalSupply > 0n ? token.tvl / parseFloat(formatEther(totalSupply)) : 0;
        return { ...token, price };
      });
    }

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      allTokens = allTokens.filter((token) =>
        token.name.toLowerCase().includes(searchLower) ||
        token.symbol.toLowerCase().includes(searchLower) ||
        token.owner_address.toLowerCase().includes(searchLower) ||
        (token.video_title && token.video_title.toLowerCase().includes(searchLower))
      );
    }

    // Apply type filter
    if (type && type !== 'all') {
      allTokens = allTokens.filter((token) => token.type === type);
    }

    // Calculate 24h price change and volume
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch recent transactions for stats calculation
    const { data: recentTxs } = await supabase
      .from('metoken_transactions')
      .select('metoken_id, transaction_type, amount, collateral_amount, created_at')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false }); // Descending for reverse replay

    // Stats map by metoken_id
    const statsMap = new Map<string, { volume: number; priceCheck: { supplyDelta: bigint; tvlDelta: number } }>();

    if (recentTxs) {
      for (const tx of recentTxs) {
        if (!statsMap.has(tx.metoken_id)) {
          statsMap.set(tx.metoken_id, { volume: 0, priceCheck: { supplyDelta: 0n, tvlDelta: 0 } });
        }
        const stats = statsMap.get(tx.metoken_id)!;

        // Volume calculation (in ETH/DAI terms)
        // For MINT: collateral_amount is the volume
        // For BURN: we estimate volume based on amount * current_price (since we process in batch, we might simplify)
        // Better: Use collateral_amount for MINT. For BURN, use an estimate if collateral is missing.
        // Assuming collateral_amount is present for MINTs

        // Note: The Price History route estimates volume for burns using price * amounts.
        // Here we'll do a simplified volume sum.
        let txVolume = 0;
        const amount = BigInt(Math.floor(tx.amount || 0));
        const collateral = parseFloat(tx.collateral_amount?.toString() || '0');

        if (tx.transaction_type === 'mint') {
          txVolume = collateral;
          // Reverse replay: User +Collateral -> +Supply. To go back, we subtract.
          stats.priceCheck.supplyDelta += amount;
          stats.priceCheck.tvlDelta += collateral;
        } else if (tx.transaction_type === 'burn') {
          // Reverse replay: User -Supply -> +Collateral. To go back, we add supply and put collateral back.
          // Problem: We don't know exact collateral returned.
          // We'll estimate it later or use 0 if negligible? No, burns affect price significantly.
          stats.priceCheck.supplyDelta -= amount;
          // We will handle TVL delta estimation when processing the token, as we need the price.
          // Store the burn amount to process later?
          // Actually, accumulating "burn amount" separately might be needed.
          // For now, let's treat tvlDelta as "known changes". For burns, we might have to use the token's current price as a proxy for the whole day?
          // Simplification: Assume constant price for volume/delta? No, defeats the purpose.
        }

        // Identify volume
        if (tx.transaction_type === 'mint') {
          stats.volume += collateral;
        } else {
          // For stats volume, we want the dollar value of the trade.
          // Use collateral if available (not in DB), else 0 (under-report) or estimate?
          // Let's use 0 for now to avoid massive errors, or improve DB later.
          stats.volume += 0;
        }
      }
    }

    // Apply calculated stats
    allTokens = allTokens.map((token) => {
      const tokenStats = statsMap.get(token.id);

      let price_change_24h = 0;
      let volume_24h = 0;

      if (tokenStats) {
        volume_24h = tokenStats.volume;

        // Calculate Price Change
        // Current Price is known: token.price
        // Price 24h ago = (CurrentTVL - DeltaTVL) / (CurrentSupply - DeltaSupply)

        // Correct logic for Reverse Replay:
        // Start: Current State
        // Review Txs (Newest to Oldest):
        //  Mint: We gained TVL and Supply. So Prev = Curr - Mint.
        //  Burn: We lost TVL and Supply. So Prev = Curr + Burn.

        const currentSupply = BigInt(token.total_supply || 0);
        const currentTvl = token.tvl;

        // We need to account for the burns that we couldn't sum up in the loop easily without price
        // Re-scan recentTxs for this token to estimate burn values? 
        // Optimization: Filter them now.
        const tokenTxs = recentTxs?.filter(tx => tx.metoken_id === token.id) || [];

        let replaySupply = currentSupply;
        let replayTvl = currentTvl;

        for (const tx of tokenTxs) {
          const amount = BigInt(Math.floor(tx.amount || 0));
          const collateral = parseFloat(tx.collateral_amount?.toString() || '0');

          // Price at this moment (approximate using current replay state)
          const replayPrice = replaySupply > 0n ? replayTvl / parseFloat(formatEther(replaySupply)) : 0;

          if (tx.transaction_type === 'mint') {
            // Undo Mint: Remove supply, remove collateral
            replaySupply -= amount;
            replayTvl -= collateral;
          } else if (tx.transaction_type === 'burn') {
            // Undo Burn: Add supply back, add collateral back
            replaySupply += amount;
            // Estimate collateral returned: amount * price
            const estCollateral = parseFloat(formatEther(amount)) * replayPrice;
            replayTvl += estCollateral;

            // Also add to volume (estimated)
            volume_24h += estCollateral;
          }
        }

        // Now replayState is "24h ago"
        const price24hAgo = replaySupply > 0n ? replayTvl / parseFloat(formatEther(replaySupply)) : 0;

        if (price24hAgo > 0) {
          price_change_24h = ((token.price - price24hAgo) / price24hAgo) * 100;
        }
      }

      return {
        ...token,
        price_change_24h,
        volume_24h,
      };
    });

    // Sort tokens
    allTokens.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'tvl':
          aValue = a.tvl;
          bValue = b.tvl;
          break;
        case 'market_cap':
          aValue = a.market_cap;
          bValue = b.market_cap;
          break;
        case 'volume_24h':
          aValue = a.volume_24h || 0;
          bValue = b.volume_24h || 0;
          break;
        case 'price_change_24h':
          aValue = a.price_change_24h || 0;
          bValue = b.price_change_24h || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.tvl;
          bValue = b.tvl;
      }

      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // Fetch creator profiles for tokens
    const ownerAddresses = [...new Set(allTokens.map((t) => t.owner_address))];
    if (ownerAddresses.length > 0) {
      const { data: profiles } = await supabase
        .from('creator_profiles')
        .select('owner_address, username, avatar_url')
        .in('owner_address', ownerAddresses);

      if (profiles) {
        const profileMap = new Map(
          profiles.map((p) => [p.owner_address.toLowerCase(), p])
        );

        allTokens = allTokens.map((token) => {
          const profile = profileMap.get(token.owner_address.toLowerCase());
          return {
            ...token,
            creator_username: profile?.username,
            creator_avatar_url: profile?.avatar_url,
          };
        });
      }
    }

    // Paginate
    const paginatedTokens = allTokens.slice(offset, offset + limit);
    const total = allTokens.length;

    // Calculate market stats if requested
    let stats: MarketStats | undefined;
    if (includeStats) {
      const totalTvl = allTokens.reduce((sum, token) => sum + token.tvl, 0);
      const totalVolume24h = allTokens.reduce((sum, token) => sum + (token.volume_24h || 0), 0);

      // Top gainers and losers (by price change)
      const sortedByChange = [...allTokens].sort(
        (a, b) => (b.price_change_24h || 0) - (a.price_change_24h || 0)
      );
      const topGainers = sortedByChange.slice(0, 5);
      const topLosers = sortedByChange.slice(-5).reverse();

      stats = {
        total_tokens: total,
        total_tvl: totalTvl,
        volume_24h: totalVolume24h,
        top_gainers: topGainers,
        top_losers: topLosers,
      };
    }

    const response = NextResponse.json({
      data: paginatedTokens,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      ...(stats && { stats }),
    });

    // Add caching headers for Vercel Edge Cache
    // Shorter cache for search queries or fresh data requests, longer for standard queries
    const cacheDuration = search || useFreshData
      ? "public, s-maxage=10, stale-while-revalidate=30" // Short cache for dynamic queries
      : "public, s-maxage=60, stale-while-revalidate=300"; // Longer cache for standard queries

    response.headers.set("Cache-Control", cacheDuration);

    // Add cache tags for Vercel cache invalidation
    const cacheTags = ['market', 'tokens', type || 'all'];
    if (search) cacheTags.push(`search:${search}`);
    response.headers.set("x-vercel-cache-tags", cacheTags.join(','));

    return response;
  } catch (error) {
    serverLogger.error('Error fetching market tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

