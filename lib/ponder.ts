import { GraphQLClient } from 'graphql-request';

const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || 'http://localhost:42069';

export const ponderClient = new GraphQLClient(PONDER_URL);

export interface TrendingToken {
  id: string;
  tokenId: string;
  mintCount: string;
  collection: {
    id: string;
    owner: string;
    network: string;
    platform: string;
    name?: string;
    image?: string;
  };
}

export const getTrendingMusic = async (): Promise<TrendingToken[]> => {
  try {
    const query = `
      query GetTrendingMusic {
        collections(orderBy: "createdAt", orderDirection: "desc", limit: 20) {
          items {
            id
            owner
            network
            platform
            name
            image
            createdAt
          }
        }
      }
    `;
    const data = await ponderClient.request<{ collections: { items: any[] } }>(query);

    return data.collections.items.map(collection => ({
      id: collection.id,
      tokenId: "0", // Default as we are fetching collections
      mintCount: "0", // Default as we don't have mint counts indexed yet
      collection: {
        id: collection.id,
        owner: collection.owner,
        network: collection.network,
        platform: collection.platform,
        name: collection.name || `New ${collection.platform} Drop`,
        image: collection.image || ""
      }
    }));
  } catch (error) {
    console.error('Failed to fetch from Ponder (is the server running at ' + PONDER_URL + '?):', error);
    return []; // Return empty array if Ponder is unavailable
  }
};
