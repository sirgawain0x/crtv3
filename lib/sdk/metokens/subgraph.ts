import { request, gql } from 'graphql-request';

// MeTokens subgraph endpoint - using local API proxy to avoid CORS issues
const getSubgraphEndpoint = () => {
  if (typeof window === 'undefined') {
    // Server-side: use relative path
    return '/api/metokens-subgraph';
  }
  // Client-side: construct full URL
  return `${window.location.origin}/api/metokens-subgraph`;
};


export interface MeToken {
  id: string;
  owner: string;
  hubId: string;
  balancePooled: string;
  balanceLocked: string;
  startTime: string;
  endTime: string;
  endCooldown: string;
  targetHubId: string;
  migration: string;
}

export interface Hub {
  id: string;
  asset: string;
  vault: string;
  owner: string;
}

export interface SubscribeEvent {
  id: string;
  meToken: string;
  hubId: string;
  assetsDeposited: string;
  blockTimestamp: string;
  blockNumber: string;
  transactionHash: string;
}

export interface MeTokenWithHub extends MeToken {
  hub: Hub;
}

// GraphQL query to get all Subscribe events (which create MeTokens)
const GET_ALL_SUBSCRIBES = gql`
  query GetAllSubscribes($first: Int = 100, $skip: Int = 0) {
    subscribes(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) {
      id
      meToken
      hubId
      assetsDeposited
      blockTimestamp
      blockNumber
      transactionHash
    }
  }
`;

// GraphQL query to get Subscribe events by meToken address
const GET_SUBSCRIBE_BY_METOKEN = gql`
  query GetSubscribeByMeToken($meToken: String!) {
    subscribes(where: { meToken: $meToken }) {
      id
      meToken
      hubId
      assetsDeposited
      blockTimestamp
      blockNumber
      transactionHash
    }
  }
`;

// GraphQL query to check if a specific MeToken exists with full details
const CHECK_METOKEN_EXISTS = gql`
  query CheckMeTokenExists($meToken: String!) {
    subscribes(where: { meToken: $meToken }, first: 1) {
      id
      meToken
      hubId
      assetsDeposited
      blockTimestamp
      blockNumber
      transactionHash
    }
  }
`;

// GraphQL query to get all MeToken addresses from Subscribe events
const GET_ALL_METOKEN_ADDRESSES = gql`
  query GetAllMeTokenAddresses($first: Int = 100, $skip: Int = 0) {
    subscribes(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) {
      meToken
    }
  }
`;

// GraphQL query to get hub information
const GET_HUB = gql`
  query GetHub($id: String!) {
    hub(id: $id) {
      id
      asset
      vault
      owner
    }
  }
`;

// GraphQL query to get recent mints
const GET_RECENT_MINTS = gql`
  query GetRecentMints($first: Int = 10) {
    mints(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      meToken
      user
      collateralAmount
      meTokenAmount
      timestamp
    }
  }
`;

// GraphQL query to get recent burns
const GET_RECENT_BURNS = gql`
  query GetRecentBurns($first: Int = 10) {
    burns(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      meToken
      user
      meTokenAmount
      collateralAmount
      timestamp
    }
  }
`;

// GraphQL query to get subscribes by hub IDs
const GET_SUBSCRIBES_BY_HUB_ID = gql`
  query GetSubscribesByHubId($hubIds: [BigInt!]) {
    subscribes(where: { hubId_in: $hubIds }) {
      id
      meToken
      hubId
      assetsDeposited
      blockTimestamp
      blockNumber
      transactionHash
    }
  }
`;

export class MeTokensSubgraphClient {
  private getEndpoint(): string {
    return getSubgraphEndpoint();
  }

  /**
   * Helper function to check if an error is an indexing error from the subgraph.
   * graphql-request may structure errors differently, so we check multiple places.
   */
  private isIndexingError(error: any): boolean {
    const errorMessage = error?.message || '';
    const responseErrors = error?.response?.errors || [];
    return (
      errorMessage.includes('indexing_error') ||
      responseErrors.some((err: any) => 
        err?.message === 'indexing_error' || 
        err?.message?.includes('indexing_error')
      )
    );
  }

  async getAllMeTokens(first: number = 100, skip: number = 0): Promise<MeToken[]> {
    if (typeof window === 'undefined') {
      return []; // Return empty array during SSR
    }

    try {
      const endpoint = this.getEndpoint();
      console.log('🔗 Querying subgraph at:', endpoint);

      const data = await request(endpoint, GET_ALL_SUBSCRIBES, { first, skip }) as any;

      // Check for GraphQL errors in the response
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        // Check if it's an indexing error
        const hasIndexingError = data.errors.some((err: any) => 
          err?.message === 'indexing_error' || err?.message?.includes('indexing_error')
        );
        if (hasIndexingError) {
          console.warn('⚠️ Subgraph indexing error - the subgraph may be syncing or experiencing issues. Returning empty array.');
          return [];
        }
        throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
      }

      const subscribeEvents = data.subscribes || [];
      console.log(`✅ Successfully fetched ${subscribeEvents.length} subscribe events`);

      // Convert Subscribe events to MeToken format
      // Note: This is a simplified conversion - in practice, you'd need to fetch
      // additional data from the Diamond contract for complete MeToken info
      return subscribeEvents.map((event: SubscribeEvent) => ({
        id: event.meToken,
        owner: '', // This would need to be fetched from Diamond contract
        hubId: event.hubId,
        balancePooled: '0', // This would need to be fetched from Diamond contract
        balanceLocked: '0', // This would need to be fetched from Diamond contract
        startTime: event.blockTimestamp,
        endTime: '0',
        endCooldown: '0',
        targetHubId: '0',
        migration: '',
      }));
    } catch (error: any) {
      console.error('❌ Failed to fetch MeTokens from subgraph:', error);

      // Handle indexing_error - subgraph is syncing or has indexing issues
      if (this.isIndexingError(error)) {
        console.warn('⚠️ Subgraph indexing error - the subgraph may be syncing or experiencing issues. Returning empty array.');
        return []; // Return empty array instead of throwing - allows app to continue
      }

      // Provide more helpful error messages for other errors
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          throw new Error('Subgraph server error (500). This may be due to: missing SUBGRAPH_QUERY_KEY, subgraph indexing issues, or server downtime.');
        }
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Cannot connect to subgraph endpoint. Check your network connection.');
        }
        throw error;
      }

      throw new Error('Failed to fetch MeTokens from subgraph');
    }
  }

  async getMeTokensByOwner(owner: string, first: number = 100, skip: number = 0): Promise<MeToken[]> {
    if (typeof window === 'undefined') {
      return []; // Return empty array during SSR
    }

    // Note: The subgraph doesn't support querying hubs or hub entities,
    // and subscribes don't contain owner information directly.
    // Owner information is stored on the Hub entity, which we cannot query.
    // Therefore, we cannot determine MeToken ownership through the subgraph alone.
    // This function returns an empty array, and the caller should rely on
    // Supabase or direct contract queries for owner-based filtering.
    console.log('⚠️ Subgraph does not support querying MeTokens by owner (hub queries unavailable). Returning empty array. Use Supabase or contract queries instead.');
    return [];
  }

  async getMeToken(id: string): Promise<MeToken | null> {
    if (typeof window === 'undefined') {
      return null; // Return null during SSR
    }

    try {
      const data = await request(this.getEndpoint(), GET_SUBSCRIBE_BY_METOKEN, { meToken: id }) as any;
      const subscribeEvents = data.subscribes || [];

      if (subscribeEvents.length === 0) {
        return null;
      }

      const event = subscribeEvents[0]; // Get the first Subscribe event for this MeToken

      // Convert Subscribe event to MeToken format
      // Note: This is a simplified conversion - in practice, you'd need to fetch
      // additional data from the Diamond contract for complete MeToken info
      return {
        id: event.meToken,
        owner: '', // This would need to be fetched from Diamond contract
        hubId: event.hubId,
        balancePooled: '0', // This would need to be fetched from Diamond contract
        balanceLocked: '0', // This would need to be fetched from Diamond contract
        startTime: event.blockTimestamp,
        endTime: '0',
        endCooldown: '0',
        targetHubId: '0',
        migration: '',
      };
    } catch (error: any) {
      console.error('Failed to fetch MeToken:', error);
      // Handle indexing_error gracefully
      if (this.isIndexingError(error)) {
        console.warn('⚠️ Subgraph indexing error - returning null');
        return null;
      }
      throw new Error('Failed to fetch MeToken from subgraph');
    }
  }

  async getHub(id: string): Promise<Hub | null> {
    if (typeof window === 'undefined') {
      return null; // Return null during SSR
    }

    try {
      const data = await request(this.getEndpoint(), GET_HUB, { id }) as any;
      return data.hub || null;
    } catch (error) {
      // The subgraph doesn't support hub queries or has indexing issues - return null gracefully
      console.warn(`⚠️ Subgraph query failed (hub ${id}):`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async getRecentMints(first: number = 10): Promise<any[]> {
    if (typeof window === 'undefined') {
      return []; // Return empty array during SSR
    }

    try {
      const data = await request(this.getEndpoint(), GET_RECENT_MINTS, { first }) as any;
      return data.mints || [];
    } catch (error: any) {
      console.error('Failed to fetch recent mints:', error);
      // Handle indexing_error gracefully - return empty array instead of throwing
      if (this.isIndexingError(error)) {
        console.warn('⚠️ Subgraph indexing error - returning empty array');
        return [];
      }
      throw new Error('Failed to fetch recent mints from subgraph');
    }
  }

  async getRecentBurns(first: number = 10): Promise<any[]> {
    if (typeof window === 'undefined') {
      return []; // Return empty array during SSR
    }

    try {
      const data = await request(this.getEndpoint(), GET_RECENT_BURNS, { first }) as any;
      return data.burns || [];
    } catch (error: any) {
      console.error('Failed to fetch recent burns:', error);
      // Handle indexing_error gracefully - return empty array instead of throwing
      if (this.isIndexingError(error)) {
        console.warn('⚠️ Subgraph indexing error - returning empty array');
        return [];
      }
      throw new Error('Failed to fetch recent burns from subgraph');
    }
  }

  async getMeTokenWithHub(id: string): Promise<MeTokenWithHub | null> {
    try {
      const meToken = await this.getMeToken(id);
      if (!meToken) return null;

      const hub = await this.getHub(meToken.hubId);
      // Return null if hub cannot be fetched (subgraph doesn't support hub queries)
      if (!hub) {
        console.warn(`⚠️ Cannot fetch hub ${meToken.hubId} for MeToken ${id} - subgraph doesn't support hub queries`);
        return null;
      }

      return {
        ...meToken,
        hub,
      };
    } catch (error) {
      console.error('Failed to fetch MeToken with Hub:', error);
      return null; // Return null instead of throwing to allow fallback to other data sources
    }
  }

  async checkMeTokenExists(meTokenAddress: string): Promise<SubscribeEvent | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      console.log('🔍 Checking if MeToken exists in subgraph:', meTokenAddress);
      const data = await request(this.getEndpoint(), CHECK_METOKEN_EXISTS, {
        meToken: meTokenAddress.toLowerCase()
      }) as any;

      const subscribes = data.subscribes || [];
      console.log('📊 Subgraph found', subscribes.length, 'Subscribe events for this address');

      if (subscribes.length > 0) {
        console.log('✅ MeToken found in subgraph:', subscribes[0]);
        return subscribes[0];
      }

      console.log('⚠️ MeToken not found in subgraph');
      return null;
    } catch (error: any) {
      console.error('Failed to check MeToken existence:', error);
      // Handle indexing_error gracefully
      if (this.isIndexingError(error)) {
        console.warn('⚠️ Subgraph indexing error - cannot check MeToken existence');
      }
      return null;
    }
  }
}

// Export a default instance
export const meTokensSubgraph = new MeTokensSubgraphClient();
