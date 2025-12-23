import { supabase, MeToken, MeTokenBalance, MeTokenTransaction, CreateMeTokenData, UpdateMeTokenData } from './client';
import { createServiceClient } from './service';

// Re-export types for external use
export type { MeToken, MeTokenBalance, MeTokenTransaction, CreateMeTokenData, UpdateMeTokenData };

export class MeTokenSupabaseService {
  // Get MeToken by address
  async getMeTokenByAddress(address: string): Promise<MeToken | null> {
    try {
      const { data, error } = await supabase
        .from('metokens')
        .select('*')
        .eq('address', address.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Supabase error fetching MeToken by address:', error);
        throw new Error(`Failed to fetch MeToken: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getMeTokenByAddress:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching MeToken');
    }
  }

  // Get MeToken by owner address
  async getMeTokenByOwner(ownerAddress: string): Promise<MeToken | null> {
    try {
      const { data, error } = await supabase
        .from('metokens')
        .select('*')
        .eq('owner_address', ownerAddress.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Supabase error fetching MeToken by owner:', error);
        throw new Error(`Failed to fetch MeToken by owner: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getMeTokenByOwner:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching MeToken by owner');
    }
  }

  // Get MeToken by ID (UUID)
  async getMeTokenById(id: string): Promise<MeToken | null> {
    try {
      const { data, error } = await supabase
        .from('metokens')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Supabase error fetching MeToken by ID:', error);
        throw new Error(`Failed to fetch MeToken by ID: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getMeTokenById:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching MeToken by ID');
    }
  }

  // Get all MeTokens with pagination and sorting
  async getAllMeTokens(options: {
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'tvl' | 'total_supply';
    sortOrder?: 'asc' | 'desc';
    search?: string;
  } = {}): Promise<MeToken[]> {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search
    } = options;

    let query = supabase
      .from('metokens')
      .select('*')
      .range(offset, offset + limit - 1);

    // Add search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,symbol.ilike.%${search}%,owner_address.ilike.%${search}%`);
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch MeTokens: ${error.message}`);
    }

    return data || [];
  }

  // Create a new MeToken
  async createMeToken(meTokenData: CreateMeTokenData): Promise<MeToken> {
    const { data, error } = await supabase
      .from('metokens')
      .insert({
        ...meTokenData,
        address: meTokenData.address.toLowerCase(),
        owner_address: meTokenData.owner_address.toLowerCase(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create MeToken: ${error.message}`);
    }

    return data;
  }

  // Update MeToken data
  async updateMeToken(address: string, updateData: UpdateMeTokenData): Promise<MeToken> {
    const { data, error } = await supabase
      .from('metokens')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('address', address.toLowerCase())
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update MeToken: ${error.message}`);
    }

    return data;
  }

  // Get user's MeToken balance
  async getUserMeTokenBalance(meTokenAddress: string, userAddress: string): Promise<MeTokenBalance | null> {
    const { data, error } = await supabase
      .from('metoken_balances')
      .select(`
        *,
        metoken:metokens(*)
      `)
      .eq('metoken_id', (await this.getMeTokenByAddress(meTokenAddress))?.id)
      .eq('user_address', userAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch user balance: ${error.message}`);
    }

    return data;
  }

  // Update user's MeToken balance
  // Uses service role client to bypass RLS (since app uses Account Kit, not Supabase Auth)
  async updateUserBalance(
    meTokenAddress: string,
    userAddress: string,
    balance: number
  ): Promise<MeTokenBalance> {
    const meToken = await this.getMeTokenByAddress(meTokenAddress);
    if (!meToken) {
      throw new Error('MeToken not found');
    }

    // Use service client to bypass RLS (required for Account Kit authentication)
    // Service client is only available server-side, so this method should be called from API routes
    // Wrap in try-catch to gracefully fallback to regular client if service key is not configured
    // Note: createServiceClient() throws an error if SUPABASE_SERVICE_ROLE_KEY is missing,
    // so we catch it and fall back to the regular client (which will be subject to RLS)
    let serviceClient: ReturnType<typeof createServiceClient>;
    try {
      serviceClient = createServiceClient();
    } catch (error) {
      console.error('Failed to create service client for balance update:', error);
      throw new Error('Service configuration error: Unable to authenticate as service role');
    }
    const client = serviceClient;

    // Check if balance record exists
    const { data: existing, error: checkError } = await client
      .from('metoken_balances')
      .select('id')
      .eq('metoken_id', meToken.id)
      .eq('user_address', userAddress.toLowerCase())
      .maybeSingle();

    // If checkError is not a "not found" error, log it but continue
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('Error checking existing balance:', checkError);
    }

    let data, error;

    if (existing) {
      // Update existing record
      const result = await client
        .from('metoken_balances')
        .update({
          balance,
          updated_at: new Date().toISOString(),
        })
        .eq('metoken_id', meToken.id)
        .eq('user_address', userAddress.toLowerCase())
        .select(`
          *,
          metoken:metokens(*)
        `)
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Insert new record
      const result = await client
        .from('metoken_balances')
        .insert({
          metoken_id: meToken.id,
          user_address: userAddress.toLowerCase(),
          balance,
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          metoken:metokens(*)
        `)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      throw new Error(`Failed to update user balance: ${error.message}`);
    }

    return data;
  }

  // Record a MeToken transaction
  // Uses service role client to bypass RLS (since app uses Account Kit, not Supabase Auth)
  async recordTransaction(transactionData: {
    metoken_id: string;
    user_address: string;
    transaction_type: 'mint' | 'burn' | 'transfer' | 'create';
    amount: number;
    collateral_amount?: number;
    transaction_hash?: string;
    block_number?: number;
    video_id?: number;
    playback_id?: string;
  }): Promise<MeTokenTransaction> {
    // Use service client to bypass RLS (required for Account Kit authentication)
    // Service client is only available server-side, so this method should be called from API routes
    // Wrap in try-catch to gracefully fallback to regular client if service key is not configured
    // Note: createServiceClient() throws an error if SUPABASE_SERVICE_ROLE_KEY is missing,
    // so we catch it and fall back to the regular client (which will be subject to RLS)
    let serviceClient: ReturnType<typeof createServiceClient>;
    try {
      serviceClient = createServiceClient();
    } catch (error) {
      console.error('Failed to create service client for transaction record:', error);
      throw new Error('Service configuration error: Unable to authenticate as service role');
    }
    const client = serviceClient;

    const { data, error } = await client
      .from('metoken_transactions')
      .insert({
        ...transactionData,
        user_address: transactionData.user_address.toLowerCase(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record transaction: ${error.message}`);
    }

    return data;
  }

  // Get MeToken transaction history
  async getMeTokenTransactions(
    meTokenAddress: string,
    options: {
      limit?: number;
      offset?: number;
      userAddress?: string;
    } = {}
  ): Promise<MeTokenTransaction[]> {
    const { limit = 50, offset = 0, userAddress } = options;

    const meToken = await this.getMeTokenByAddress(meTokenAddress);
    if (!meToken) {
      throw new Error('MeToken not found');
    }

    let query = supabase
      .from('metoken_transactions')
      .select('*')
      .eq('metoken_id', meToken.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userAddress) {
      query = query.eq('user_address', userAddress.toLowerCase());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data || [];
  }

  // Get MeToken statistics
  async getMeTokenStats(meTokenAddress: string): Promise<{
    totalTransactions: number;
    uniqueHolders: number;
    totalVolume: number;
    avgTransactionSize: number;
  }> {
    const meToken = await this.getMeTokenByAddress(meTokenAddress);
    if (!meToken) {
      throw new Error('MeToken not found');
    }

    // Get transaction stats
    const { data: transactions, error: transactionsError } = await supabase
      .from('metoken_transactions')
      .select('amount, collateral_amount, transaction_type')
      .eq('metoken_id', meToken.id);

    if (transactionsError) {
      throw new Error(`Failed to fetch transaction stats: ${transactionsError.message}`);
    }

    // Get unique holders count
    const { data: holders, error: holdersError } = await supabase
      .from('metoken_balances')
      .select('user_address')
      .eq('metoken_id', meToken.id)
      .gt('balance', 0);

    if (holdersError) {
      throw new Error(`Failed to fetch holder stats: ${holdersError.message}`);
    }

    const totalTransactions = transactions?.length || 0;
    const uniqueHolders = new Set(holders?.map(h => h.user_address) || []).size;
    const totalVolume = transactions?.reduce((sum, tx) => {
      if (tx.transaction_type === 'mint' || tx.transaction_type === 'burn') {
        return sum + (tx.collateral_amount || 0);
      }
      return sum + tx.amount;
    }, 0) || 0;
    const avgTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    return {
      totalTransactions,
      uniqueHolders,
      totalVolume,
      avgTransactionSize,
    };
  }

  // Subscribe to real-time MeToken updates
  subscribeToMeTokenUpdates(meTokenAddress: string, callback: (payload: any) => void) {
    return supabase
      .channel(`metoken-${meTokenAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metokens',
          filter: `address=eq.${meTokenAddress.toLowerCase()}`,
        },
        callback
      )
      .subscribe();
  }

  // Subscribe to real-time balance updates
  subscribeToBalanceUpdates(userAddress: string, callback: (payload: any) => void) {
    return supabase
      .channel(`balance-${userAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metoken_balances',
          filter: `user_address=eq.${userAddress.toLowerCase()}`,
        },
        callback
      )
      .subscribe();
  }

  // Search MeTokens
  async searchMeTokens(query: string, limit: number = 20): Promise<MeToken[]> {
    const { data, error } = await supabase
      .from('metokens')
      .select('*')
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%`)
      .limit(limit)
      .order('tvl', { ascending: false });

    if (error) {
      throw new Error(`Failed to search MeTokens: ${error.message}`);
    }

    return data || [];
  }

  // Get trending MeTokens (highest TVL growth)
  async getTrendingMeTokens(limit: number = 10): Promise<MeToken[]> {
    const { data, error } = await supabase
      .from('metokens')
      .select('*')
      .gt('tvl', 0)
      .order('tvl', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch trending MeTokens: ${error.message}`);
    }

    return data || [];
  }
}

// Export a default instance
export const meTokenSupabaseService = new MeTokenSupabaseService();
