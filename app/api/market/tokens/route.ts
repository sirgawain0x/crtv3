import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { formatEther } from 'viem';

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
    const useFreshData = searchParams.get('fresh') === 'true'; // Option to fetch fresh data from blockchain

    const supabase = await createClient();

    // Fetch MeTokens
    const meTokenOptions = {
      limit: type === 'content_coin' ? 0 : 1000, // Get all if not filtering to content coins only
      offset: 0,
      sortBy: 'tvl' as const,
      sortOrder: 'desc' as const,
      search: search || undefined,
    };

    const meTokens = type === 'content_coin' ? [] : await meTokenSupabaseService.getAllMeTokens(meTokenOptions);

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

    // Helper function to refresh a single token's data from blockchain
    // Note: For performance, we'll only refresh if explicitly requested
    // In production, you might want to batch these or use a background job
    const refreshTokenData = async (address: string): Promise<any> => {
      if (!useFreshData) return null;
      
      try {
        // Import the fresh data function directly instead of making HTTP request
        const { getMeTokenInfoFromBlockchain, getMeTokenProtocolInfo } = await import('@/lib/utils/metokenUtils');
        const { createPublicClient, http, formatEther } = await import('viem');
        const { base } = await import('viem/chains');
        
        const publicClient = createPublicClient({
          chain: base,
          transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL),
        });

        const ERC20_ABI = [
          {
            constant: true,
            inputs: [],
            name: 'totalSupply',
            outputs: [{ name: '', type: 'uint256' }],
            type: 'function',
          },
        ] as const;

        const [tokenInfo, protocolInfo, totalSupply] = await Promise.all([
          getMeTokenInfoFromBlockchain(address as `0x${string}`),
          getMeTokenProtocolInfo(address as `0x${string}`),
          publicClient.readContract({
            address: address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'totalSupply',
          }) as Promise<bigint>,
        ]);

        if (!protocolInfo) {
          return null;
        }

        const balancePooled = BigInt(protocolInfo.balancePooled || 0);
        const balanceLocked = BigInt(protocolInfo.balanceLocked || 0);
        const totalBalance = balancePooled + balanceLocked;
        const tvl = parseFloat(formatEther(totalBalance));
        const supply = parseFloat(formatEther(totalSupply));
        const price = supply > 0 ? tvl / supply : 0;

        return {
          tvl,
          price,
          total_supply: totalSupply.toString(),
        };
      } catch (error) {
        console.warn(`Failed to refresh token ${address}:`, error);
        return null;
      }
    };

    // Transform MeTokens
    for (const meToken of meTokens) {
      let tokenData = {
        id: meToken.id,
        address: meToken.address,
        name: meToken.name,
        symbol: meToken.symbol,
        owner_address: meToken.owner_address,
        type: 'metoken' as const,
        price: 0,
        tvl: meToken.tvl,
        total_supply: meToken.total_supply?.toString() || '0',
        market_cap: meToken.tvl,
        created_at: meToken.created_at,
      };

      // If fresh data is requested, try to fetch it (but don't block on failure)
      if (useFreshData) {
        const freshData = await refreshTokenData(meToken.address);
        if (freshData) {
          tokenData = {
            ...tokenData,
            tvl: freshData.tvl,
            price: freshData.price,
            total_supply: freshData.total_supply,
            market_cap: freshData.tvl,
          };
        } else {
          // Fallback to Supabase data
          const totalSupply = BigInt(meToken.total_supply || 0);
          tokenData.price = totalSupply > 0 ? meToken.tvl / parseFloat(formatEther(totalSupply)) : 0;
        }
      } else {
        // Use Supabase data
        const totalSupply = BigInt(meToken.total_supply || 0);
        tokenData.price = totalSupply > 0 ? meToken.tvl / parseFloat(formatEther(totalSupply)) : 0;
      }

      allTokens.push(tokenData);
    }

    // Transform Content Coins
    for (const contentCoin of contentCoins) {
      let tokenData = {
        id: contentCoin.id,
        address: contentCoin.address,
        name: contentCoin.name,
        symbol: contentCoin.symbol,
        owner_address: contentCoin.owner_address,
        type: 'content_coin' as const,
        price: 0,
        tvl: contentCoin.tvl,
        total_supply: contentCoin.total_supply?.toString() || '0',
        market_cap: contentCoin.tvl,
        video_id: contentCoin.video_id,
        video_title: contentCoin.video_title,
        playback_id: contentCoin.playback_id,
        thumbnail_url: contentCoin.thumbnail_url,
        created_at: contentCoin.created_at,
      };

      // If fresh data is requested, try to fetch it (but don't block on failure)
      if (useFreshData) {
        const freshData = await refreshTokenData(contentCoin.address);
        if (freshData) {
          tokenData = {
            ...tokenData,
            tvl: freshData.tvl,
            price: freshData.price,
            total_supply: freshData.total_supply,
            market_cap: freshData.tvl,
          };
        } else {
          // Fallback to Supabase data
          const totalSupply = BigInt(contentCoin.total_supply || 0);
          tokenData.price = totalSupply > 0 ? contentCoin.tvl / parseFloat(formatEther(totalSupply)) : 0;
        }
      } else {
        // Use Supabase data
        const totalSupply = BigInt(contentCoin.total_supply || 0);
        tokenData.price = totalSupply > 0 ? contentCoin.tvl / parseFloat(formatEther(totalSupply)) : 0;
      }

      allTokens.push(tokenData);
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

    // Calculate 24h price change and volume (simplified - would need transaction history)
    // For now, we'll set these to 0 and they can be calculated later from transactions
    allTokens = allTokens.map((token) => ({
      ...token,
      price_change_24h: 0, // TODO: Calculate from transactions
      volume_24h: 0, // TODO: Calculate from transactions
    }));

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

    return NextResponse.json({
      data: paginatedTokens,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error('Error fetching market tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

