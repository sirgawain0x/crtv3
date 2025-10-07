import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/sdk/supabase/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';

// GET /api/metokens - Get MeTokens with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const address = searchParams.get('address');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as 'created_at' | 'tvl' | 'total_supply' || 'created_at';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    let result;

    if (address) {
      // Get specific MeToken by address
      result = await meTokenSupabaseService.getMeTokenByAddress(address);
      return NextResponse.json({ data: result });
    } else if (owner) {
      // Get MeToken by owner
      result = await meTokenSupabaseService.getMeTokenByOwner(owner);
      return NextResponse.json({ data: result });
    } else if (search) {
      // Search MeTokens
      result = await meTokenSupabaseService.searchMeTokens(search, limit);
      return NextResponse.json({ data: result });
    } else {
      // Get all MeTokens with pagination
      result = await meTokenSupabaseService.getAllMeTokens({
        limit,
        offset,
        sortBy,
        sortOrder,
        search: search || undefined,
      });
      return NextResponse.json({ data: result });
    }
  } catch (error) {
    console.error('Error fetching MeTokens:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch MeToken')) {
        return NextResponse.json(
          { error: 'MeToken not found', data: null },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch MeTokens' },
      { status: 500 }
    );
  }
}

// POST /api/metokens - Create a new MeToken
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Verify the user is authenticated (optional - depends on your auth setup)
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const {
      address,
      owner_address,
      name,
      symbol,
      total_supply,
      tvl,
      hub_id,
      balance_pooled,
      balance_locked,
      start_time,
      end_time,
      end_cooldown,
      target_hub_id,
      migration_address,
    } = body;

    // Validate required fields
    if (!address || !owner_address || !name || !symbol) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const meTokenData = {
      address,
      owner_address,
      name,
      symbol,
      total_supply: total_supply || 0,
      tvl: tvl || 0,
      hub_id: hub_id || 1,
      balance_pooled: balance_pooled || 0,
      balance_locked: balance_locked || 0,
      start_time,
      end_time,
      end_cooldown,
      target_hub_id,
      migration_address,
    };

    const result = await meTokenSupabaseService.createMeToken(meTokenData);
    
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating MeToken:', error);
    return NextResponse.json(
      { error: 'Failed to create MeToken' },
      { status: 500 }
    );
  }
}
