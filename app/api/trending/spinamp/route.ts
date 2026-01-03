import { NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';

const SPINAMP_API_URL = 'https://api.spinamp.xyz/v3/graphql';

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

export async function GET() {
    try {
        const spinampClient = new GraphQLClient(SPINAMP_API_URL);
        const data = await spinampClient.request<{ allProcessedTracks: { nodes: any[] } }>(RECENT_TRACKS_QUERY);

        const tracks = data.allProcessedTracks.nodes.map((track) => ({
            id: track.id,
            tokenId: track.id,
            mintCount: "0",
            collection: {
                id: track.id,
                owner: "Unknown",
                network: "multiple",
                platform: "Spinamp",
                name: `${track.artistByArtistId.name} - ${track.title}`,
                image: track.lossyArtworkUrl,
            },
        }));

        return NextResponse.json(tracks);
    } catch (error) {
        console.error("Failed to fetch Spinamp data:", error);
        return NextResponse.json([], { status: 200 }); // Return empty array on error
    }
}
