'use client';
import React from 'react';
import VideoCard from './VideoCard';
import { AssetData } from '@app/lib/types';

// Add video props to the VideoCardGrid component
interface VideoCardGridProps {
  assets: AssetData[];
}

const VideoCardGrid: React.FC<VideoCardGridProps> = ({ assets }) => {
  if (!assets || assets.length === 0) {
    return <p>No videos available.</p>;
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {assets.map((asset) => (
          <div key={asset.id}>
            <VideoCard assetData={asset} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoCardGrid;
