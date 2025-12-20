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

// GraphQL query to get registers by owner
const GET_REGISTERS_BY_OWNER = gql`
  query GetRegistersByOwner($owner: String!) {
    registers(where: { owner: $owner }) {
      id
      hubId
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

  async getAllMeTokens(first: number = 100, skip: number = 0): Promise<MeToken[]> {
    if (typeof window === 'undefined') {
      return []; // Return empty array during SSR
    }

    try {
      const endpoint = this.getEndpoint();
      console.log('🔗 Querying subgraph at:', endpoint);

      const data = await request(endpoint, GET_ALL_SUBSCRIBES, { first, skip }) as any;

      // Check for GraphQL errors
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
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
    } catch (error) {
      console.error('❌ Failed to fetch MeTokens from subgraph:', error);

      // Provide more helpful error messages
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

    try {
      console.log('🔍 Querying subgraph for Registers by owner:', owner);

      // 1. Find Hubs owned by user using Registers
      // Assuming 'registers' entity exists and has 'hubId' field
      const registerData = await request(this.getEndpoint(), GET_REGISTERS_BY_OWNER, { owner: owner.toLowerCase() }) as any;
      const registers = registerData.registers || [];

      if (registers.length === 0) {
        console.log('ℹ️ No registers found for owner');
        return [];
      }

      console.log(`✅ Found ${registers.length} registers for owner. Fetching corresponding MeTokens...`);

      // Extract Hub IDs
      const hubIds = registers.map((r: any) => r.hubId || r.id); // Fallback to id if hubId missing, but unlikely to work if id is hash

      // 2. Find Subscribes for these Hubs
      const subscribeData = await request(this.getEndpoint(), GET_SUBSCRIBES_BY_HUB_ID, { hubIds }) as any;
      const subscribeEvents = subscribeData.subscribes || [];

      console.log(`✅ Found ${subscribeEvents.length} MeTokens via Hub lookup`);

      // Map to MeToken format
      return subscribeEvents.map((event: SubscribeEvent) => ({
        id: event.meToken,
        owner: owner,
        hubId: event.hubId,
        balancePooled: '0',
        balanceLocked: '0',
        startTime: event.blockTimestamp,
        endTime: '0',
        endCooldown: '0',
        targetHubId: '0',
        migration: '',
      }));

    } catch (error) {
      console.warn('⚠️ Failed to fetch MeTokens by owner (Registers strategy):', error);
      // Fallback
      return [];
    }
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
    } catch (error) {
      console.error('Failed to fetch MeToken:', error);
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
      console.error('Failed to fetch Hub:', error);
      throw new Error('Failed to fetch Hub from subgraph');
    }
  }

  async getRecentMints(first: number = 10): Promise<any[]> {
    if (typeof window === 'undefined') {
      return []; // Return empty array during SSR
    }

    try {
      const data = await request(this.getEndpoint(), GET_RECENT_MINTS, { first }) as any;
      return data.mints || [];
    } catch (error) {
      console.error('Failed to fetch recent mints:', error);
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
    } catch (error) {
      console.error('Failed to fetch recent burns:', error);
      throw new Error('Failed to fetch recent burns from subgraph');
    }
  }

  async getMeTokenWithHub(id: string): Promise<MeTokenWithHub | null> {
    try {
      const meToken = await this.getMeToken(id);
      if (!meToken) return null;

      const hub = await this.getHub(meToken.hubId);
      if (!hub) return null;

      return {
        ...meToken,
        hub,
      };
    } catch (error) {
      console.error('Failed to fetch MeToken with Hub:', error);
      throw new Error('Failed to fetch MeToken with Hub from subgraph');
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
    } catch (error) {
      console.error('Failed to check MeToken existence:', error);
      return null;
    }
  }
}

// Export a default instance
export const meTokensSubgraph = new MeTokensSubgraphClient();
