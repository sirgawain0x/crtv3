import { GraphQLClient } from 'graphql-request';

const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || 'http://localhost:42069';

export const ponderClient = new GraphQLClient(PONDER_URL);

interface TrendingToken {
    id: string;
    tokenId: string;
    mintCount: string;
    collection: {
        id: string;
        owner: string;
        network: string;
        platform: string;
    };
}

export const getTrendingMusic = async (): Promise<TrendingToken[]> => {
    const query = `
    query GetTrendingMusic {
      tokens(orderBy: "mintCount", orderDirection: "desc", limit: 20) {
        id
        tokenId
        mintCount
        collection {
          id
          owner
          network
          platform
        }
      }
    }
  `;
    const data = await ponderClient.request<{ tokens: TrendingToken[] }>(query);
    return data.tokens;
};
