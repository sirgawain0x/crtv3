import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import React, { useState } from 'react';

interface SimplePlayerProps {
  src: string;
  playbackId?: string;
}

export const SimplePlayer: React.FC<SimplePlayerProps> = async ({
  src,
  playbackId,
}) => {
  const [assetMetadata, setAssetMetadata] = useState<any | null>(null);

  const { getAssetMetadata } = useOrbisContext();

  if (playbackId) {
    setAssetMetadata(await getAssetMetadata(playbackId));
  }

  return (
    <video
      id="video"
      controls
      poster={assetMetadata?.thumbnailUri}
      preload="metadata"
    >
      <source src={src} type="video/mp4" />
      {assetMetadata?.subtitles && (
        <track
          label={assetMetadata.subtitles.language}
          kind="subtitles"
          src={assetMetadata.subtitles}
          default
        />
      )}
    </video>
  );
};
