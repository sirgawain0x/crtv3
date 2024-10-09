import React, { FC, useEffect } from 'react';

interface PreviewVideoProps {
  video: File;
}

const PreviewVideo: FC<PreviewVideoProps> = ({ video }) => {
  const objectUrl = URL.createObjectURL(video); // Create the object URL

  useEffect(() => {
    // Clean up function to revoke the object URL when the component unmounts or the video file changes
    return () => {
      URL.revokeObjectURL(objectUrl); // Revoke the object URL
    };
  }, [objectUrl, video]); // Dependency array: useEffect runs when the video prop changes

  return (
    <div className="flex w-full justify-center">
      {' '}
      {/* Center the video horizontally */}
      {video && (
        <video
          src={objectUrl}
          controls
          style={{ maxWidth: '100%', maxHeight: '400px', marginTop: '8px' }} // Make video responsive
        />
      )}
    </div>
  );
};

export default PreviewVideo;
