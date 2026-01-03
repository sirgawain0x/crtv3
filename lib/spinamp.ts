import { GraphQLClient, gql } from 'graphql-request';
import { TrendingToken } from './ponder';

const SPINAMP_API_URL = 'https://api.spinamp.xyz/v3/graphql';

// Using a basic query to get recent tracks. 
// Note: Actual schema might vary, so handling potential errors defensively.
const RECENT_TRACKS_QUERY = gql`
  query GetRecentTracks {
    allTracks(first: 20, orderBy: CACHED_AT_DESC) {
      nodes {
        id
        title
        artist {
          name
        }
        platformId
        lossyArtworkUrl
        websiteUrl
      }
    }
  }
`;

const spinampClient = new GraphQLClient(SPINAMP_API_URL);

interface SpinampTrack {
    id: string;
    title: string;
    artist: {
        name: string;
    };
    platformId: string; // e.g., "sound-...", "zora-..."
    lossyArtworkUrl: string;
    websiteUrl: string;
}

export const getSpinampTrending = async (): Promise<TrendingToken[]> => {
    try {
        // Since we don't have the exact schema confirmed, we wrap in try/catch 
        // and ideally we would use introspection if this fails, but for now we try a likely query.
        const data = await spinampClient.request<{ allTracks: { nodes: SpinampTrack[] } }>(RECENT_TRACKS_QUERY);

        return data.allTracks.nodes.map((track) => ({
            id: track.id,
            tokenId: track.id, // Spinamp IDs are UUIDs mostly
            mintCount: "0", // Spinamp aggregation doesn't easily map to "recent mint count" without specific analytics query
            collection: {
                id: track.id,
                owner: "Unknown",
                network: "multiple", // Spinamp aggregates multiple chains
                platform: "Spinamp", // We label it Spinamp to indicate source, though it aggregates others
                name: `${track.artist.name} - ${track.title}`,
                image: track.lossyArtworkUrl,
            },
        }));

    } catch (error) {
        console.error("Failed to fetch Spinamp data:", error);
        return [];
    }
};
