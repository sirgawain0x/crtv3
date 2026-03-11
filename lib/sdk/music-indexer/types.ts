export interface MusicTrack {
  id: string;
  title: string | null;
  artist: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  metadataUri: string | null;
  platform: string;
  chain: string;
  createdAt: string;
  owner: string;
  contract: string;
  tokenId: string;
}

export interface MusicTrackQueryResult {
  musicTracks: MusicTrack[];
}
