import React, { FC, useEffect, useState } from 'react';

interface PreviewVideoProps {
  video: File | null;
}

const PreviewVideo: FC<PreviewVideoProps> = ({ video }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (video) {
      const objectUrl = URL.createObjectURL(video);
      setVideoUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [video]);

  return (
    <div className="flex w-full justify-center">
      {videoUrl && (
        <video
          controls
          style={{ maxWidth: '100%', maxHeight: '400px', marginTop: '8px' }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}
    </div>
  );
};

export default PreviewVideo;
