import { supabase, MeToken, MeTokenBalance, MeTokenTransaction, CreateMeTokenData, UpdateMeTokenData } from './client';

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
  async updateUserBalance(
    meTokenAddress: string,
    userAddress: string,
    balance: number
  ): Promise<MeTokenBalance> {
    const meToken = await this.getMeTokenByAddress(meTokenAddress);
    if (!meToken) {
      throw new Error('MeToken not found');
    }

    const { data, error } = await supabase
      .from('metoken_balances')
      .upsert({
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

    if (error) {
      throw new Error(`Failed to update user balance: ${error.message}`);
    }

    return data;
  }

  // Record a MeToken transaction
  async recordTransaction(transactionData: {
    metoken_id: string;
    user_address: string;
    transaction_type: 'mint' | 'burn' | 'transfer' | 'create';
    amount: number;
    collateral_amount?: number;
    transaction_hash?: string;
    block_number?: number;
  }): Promise<MeTokenTransaction> {
    const { data, error } = await supabase
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
