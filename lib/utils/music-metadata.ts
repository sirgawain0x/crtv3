import { musicIpfsToGroveGateway } from '@/lib/utils/music-ipfs-gateway';

export interface ResolvedMusicMetadata {
  title: string | null;
  artist: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
}

export async function resolveMusicMetadata(metadataUri: string | null): Promise<ResolvedMusicMetadata> {
  const empty: ResolvedMusicMetadata = { title: null, artist: null, imageUrl: null, audioUrl: null };
  if (!metadataUri?.trim()) return empty;

  const url = metadataUri.startsWith('ipfs://') || /^(Qm|baf)/.test(metadataUri)
    ? musicIpfsToGroveGateway(metadataUri)
    : metadataUri.startsWith('http') ? metadataUri : musicIpfsToGroveGateway(metadataUri);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return empty;
    const json = (await res.json()) as Record<string, unknown>;
    const name = (json.name ?? json.title) as string | undefined;
    const artist = (json.artist ?? json.artist_name ?? json.creator) as string | undefined;
    const audio = (json.animation_url ?? json.audio ?? json.audio_url) as string | undefined;
    const image = (json.image ?? json.image_url) as string | undefined;
    const imageResolved = image ? (String(image).startsWith('ipfs://') ? musicIpfsToGroveGateway(image) : image) : null;
    const audioResolved = audio ? (String(audio).startsWith('ipfs://') ? musicIpfsToGroveGateway(audio) : audio) : null;
    return { title: name ?? null, artist: artist ?? null, imageUrl: imageResolved ?? null, audioUrl: audioResolved ?? null };
  } catch {
    return empty;
  }
}
