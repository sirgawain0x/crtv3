import { GraphQLClient, gql } from 'graphql-request';
import { TrendingToken } from './ponder';

const SPINAMP_API_URL = 'https://api.spinamp.xyz/v3/graphql';

// Query for recent processed tracks from Spinamp
const RECENT_TRACKS_QUERY = gql`
  query GetRecentTracks {
    allProcessedTracks(first: 20) {
      nodes {
        id
        title
        artistByArtistId {
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
  artistByArtistId: {
    name: string;
  };
  platformId: string; // e.g., "sound-...", "zora-..."
  lossyArtworkUrl: string;
  websiteUrl: string;
}

export const getSpinampTrending = async (): Promise<TrendingToken[]> => {
  try {
    const response = await fetch('/api/trending/spinamp');

    if (!response.ok) {
      console.error("Failed to fetch Spinamp data:", response.statusText);
      return [];
    }

    const tracks = await response.json();
    return tracks;

  } catch (error) {
    console.error("Failed to fetch Spinamp data:", error);
    return [];
  }
};
