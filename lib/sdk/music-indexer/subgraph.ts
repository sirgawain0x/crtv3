import { request, gql } from 'graphql-request';
import type { MusicTrack, MusicTrackQueryResult } from './types';

const getEndpoint = () => (typeof window === 'undefined' ? '/api/music-indexer-subgraph' : `${window.location.origin}/api/music-indexer-subgraph`);

const GET_LATEST_TRACKS = gql`
  query GetLatestTracks($first: Int = 50, $skip: Int = 0) {
    musicTracks(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id title artist audioUrl imageUrl metadataUri platform chain createdAt owner contract tokenId
    }
  }
`;

const GET_TRACKS_BY_PLATFORM = gql`
  query GetTracksByPlatform($platform: String!, $first: Int = 50, $skip: Int = 0) {
    musicTracks(where: { platform: $platform }, first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id title artist audioUrl imageUrl metadataUri platform chain createdAt owner contract tokenId
    }
  }
`;

const GET_TRACKS_BY_CHAIN = gql`
  query GetTracksByChain($chain: String!, $first: Int = 50, $skip: Int = 0) {
    musicTracks(where: { chain: $chain }, first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id title artist audioUrl imageUrl metadataUri platform chain createdAt owner contract tokenId
    }
  }
`;

export class MusicIndexerSubgraphClient {
  getEndpoint() { return getEndpoint(); }

  async getLatestTracks(limit = 50, skip = 0): Promise<MusicTrack[]> {
    const data = await request<MusicTrackQueryResult>(getEndpoint(), GET_LATEST_TRACKS, { first: limit, skip });
    return data?.musicTracks ?? [];
  }

  async getTracksByPlatform(platform: string, limit = 50, skip = 0): Promise<MusicTrack[]> {
    const data = await request<MusicTrackQueryResult>(getEndpoint(), GET_TRACKS_BY_PLATFORM, { platform, first: limit, skip });
    return data?.musicTracks ?? [];
  }

  async getTracksByChain(chain: string, limit = 50, skip = 0): Promise<MusicTrack[]> {
    const data = await request<MusicTrackQueryResult>(getEndpoint(), GET_TRACKS_BY_CHAIN, { chain, first: limit, skip });
    return data?.musicTracks ?? [];
  }
}

export const musicIndexerSubgraph = new MusicIndexerSubgraphClient();
