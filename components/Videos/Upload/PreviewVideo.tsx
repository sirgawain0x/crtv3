import React, { FC, useEffect, useState, useRef } from "react";
import { AlertCircle, Play } from "lucide-react";

interface PreviewVideoProps {
  video: File | null;
}

const PreviewVideo: FC<PreviewVideoProps> = ({ video }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage("");
      
      try {
        const objectUrl = URL.createObjectURL(video);
        setVideoUrl(objectUrl);

        // Clean up the object URL when the component unmounts or video changes
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (error) {
        setHasError(true);
        setErrorMessage("Failed to create video preview");
        setIsLoading(false);
      }
    } else {
      setVideoUrl(null);
      setHasError(false);
      setErrorMessage("");
    }
  }, [video]);

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    
    const target = e.target as HTMLVideoElement;
    const error = target.error;
    
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          setErrorMessage("Video loading was aborted");
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          setErrorMessage("Network error occurred while loading video");
          break;
        case MediaError.MEDIA_ERR_DECODE:
          setErrorMessage("Video format not supported by browser");
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          setErrorMessage("Video format or codec not supported");
          break;
        default:
          setErrorMessage("Unknown error occurred while loading video");
      }
    } else {
      setErrorMessage("Video failed to load");
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    // Force video reload
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div className="flex w-full items-center justify-center">
      {videoUrl && (
        <div className="relative w-full pt-[56.25%] bg-gray-100 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading video preview...</p>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center p-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-red-600 mb-2">{errorMessage}</p>
                <p className="text-xs text-gray-500 mb-4">
                  File: {video?.name}
                </p>
                <button
                  onClick={handleRetry}
                  className="px-3 py-1 text-xs bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            controls
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-contain"
            preload="metadata"
            playsInline
            controlsList="nodownload"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            style={{ display: hasError ? 'none' : 'block' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default PreviewVideo;
