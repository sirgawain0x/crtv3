"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import {
  getLivepeerUploadUrl,
  getLivepeerAsset,
} from "@/app/api/livepeer/assetUploadActions";
import * as tus from "tus-js-client";
import PreviewVideo from "./PreviewVideo";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { updateVideoAsset } from "@/services/video-assets";
import { useUniversalAccount } from "@/lib/hooks/accountkit/useUniversalAccount";
import { useTranscoder } from "@/lib/hooks/useTranscoder";
import { logger } from "@/lib/utils/logger";

const truncateUri = (uri: string): string => {
  if (uri.length <= 30) return uri;
  return uri.slice(0, 15) + "..." + uri.slice(-15);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast("IPFS URI Copied!");
  });
};

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onFileUploaded: (fileUrl: string) => void;
  onPressNext?: (livepeerAsset: any) => void;
  onPressBack?: () => void;
  metadata?: any;
  newAssetTitle?: string;
  hideNavigation?: boolean;
  onAssetReady?: (asset: any) => void;
}

async function pollForMetadataUri(
  assetId: string,
  maxAttempts = 20,
  interval = 5000
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const asset = await getLivepeerAsset(assetId);
    const metadataUri = asset?.storage?.ipfs?.nftMetadata?.url;
    const isReady = asset?.status?.phase === "ready";
    if (metadataUri && isReady) return metadataUri;
    await new Promise((res) => setTimeout(res, interval));
  }
  throw new Error("Timed out waiting for metadata_uri");
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileUploaded,
  onPressNext,
  onPressBack,
  metadata,
  newAssetTitle,
  hideNavigation = false,
  onAssetReady,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "loading" | "transcoding" | "complete"
  >("idle");

  const [livepeerAsset, setLivepeerAsset] = useState<any>();
  const [isPolling, setIsPolling] = useState(false);

  // Use ref to persist asset data across re-renders
  const livepeerAssetRef = useRef<any>(null);

  // Use Universal Account to get smart account address (SCA), not controller wallet
  const { address, type, loading } = useUniversalAccount();

  const { transcode, status: transcodeStatus, progress: transcodeProgress, error: transcodeError } = useTranscoder();

  // Persist upload state to recover from page reloads
  useEffect(() => {
    if (uploadState === 'loading' && livepeerAsset?.id) {
      const uploadData = {
        assetId: livepeerAsset.id,
        progress,
        timestamp: Date.now(),
        metadata: metadata,
        address,
      };
      localStorage.setItem('upload-in-progress', JSON.stringify(uploadData));
      logger.debug('Upload state saved:', uploadData);
    } else if (uploadState === 'complete' && livepeerAsset?.id) {
      localStorage.removeItem('upload-in-progress');
      logger.debug('Upload completed, state cleared');
    }
  }, [uploadState, livepeerAsset, progress, metadata, address]);

  // Check for interrupted upload on mount and attempt recovery
  useEffect(() => {
    const checkInterruptedUpload = async () => {
      const savedUpload = localStorage.getItem('upload-in-progress');
      if (savedUpload && address) {
        try {
          const { assetId, timestamp, address: savedAddress } = JSON.parse(savedUpload);

          // Only recover if same user and upload was within last 30 minutes
          if (savedAddress === address && Date.now() - timestamp < 30 * 60 * 1000) {
            logger.debug('Attempting to recover interrupted upload:', assetId);
            toast.info('Checking previous upload status...');

            const asset = await getLivepeerAsset(assetId);
            if (asset) {
              logger.debug('Recovered asset:', asset);
              setLivepeerAsset(asset);

              if (asset.status?.phase === 'ready') {
                setUploadState('complete');
                setUploadComplete(true);
                setProgress(100);
                toast.success('Previous upload recovered successfully!');
                localStorage.removeItem('upload-in-progress');
              } else if (asset.status?.phase === 'processing') {
                setUploadState('loading');
                setProgress(75);
                toast.info('Upload is still processing...');
              } else if (asset.status?.phase === 'failed') {
                toast.error('Previous upload failed. Please try again.');
                localStorage.removeItem('upload-in-progress');
              }
            }
          } else {
            // Clear stale upload data
            localStorage.removeItem('upload-in-progress');
          }
        } catch (error) {
          logger.error('Failed to recover upload:', error);
          localStorage.removeItem('upload-in-progress');
        }
      }
    };

    if (!loading && address) {
      checkInterruptedUpload();
    }
  }, [loading, address]);

  // Livepeer supported video formats
  // Containers: MP4, MOV, MKV, WebM, FLV, TS
  // Video codecs: H.264, H.265 (HEVC), VP8, VP9, AV1
  const SUPPORTED_VIDEO_FORMATS = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-matroska', // .mkv
    'video/webm',
    'video/x-flv',
    'video/mp2t', // .ts
    'video/mpeg',
  ];

  const SUPPORTED_VIDEO_EXTENSIONS = [
    '.mp4',
    '.mov',
    '.mkv',
    '.webm',
    '.flv',
    '.ts',
    '.mpeg',
    '.mpg',
  ];

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    // Reset state
    setUploadState("idle");
    setProgress(0);
    setUploadComplete(false);
    setError(null);

    if (!file) {
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    // Check if transcoding is needed
    // Simple check: if not mp4/mov or codec check fails (though we can't easily check codec in JS without parsing)
    // For now, we rely on the file extension/type. 
    // If it's MKV, AVI, WEBM, we assume we want to transcode to ensure compatibility.
    // If it is MP4/MOV but fails Livepeer processing later, user might need to retry manually or we force transcode.
    // Here we will offer auto-transcode for containers that are often problematic or not supported by direct playback in some browsers.
    const needsTranscoding = !['video/mp4', 'video/quicktime'].includes(file.type) ||
      file.name.endsWith('.mkv') ||
      file.name.endsWith('.avi') ||
      file.name.endsWith('.webm');

    if (needsTranscoding) {
      toast.info("This video format requires conversion. It will be transcoded automatically before upload.");
    }

    setSelectedFile(file);
    onFileSelect(file);
    logger.debug("Selected file:", file?.name, "Address:", address, "Type:", type, "Needs Transcoding:", needsTranscoding);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    if (!address) {
      setError("Please connect your wallet to upload videos.");
      return;
    }

    setError(null);
    setUploadState("loading");
    setProgress(0);

    let fileToUpload = selectedFile;

    // Transcode if needed
    const needsTranscoding = !['video/mp4', 'video/quicktime'].includes(selectedFile.type) ||
      selectedFile.name.endsWith('.mkv') ||
      selectedFile.name.endsWith('.avi') ||
      selectedFile.name.endsWith('.webm');

    if (needsTranscoding) {
      setUploadState("transcoding");
      logger.debug("Starting transcoding...");
      const transcodedFile = await transcode(selectedFile);

      if (!transcodedFile || transcodeError) {
        setError("Transcoding failed: " + (transcodeError || "Unknown error"));
        setUploadState("idle");
        return;
      }

      fileToUpload = transcodedFile;
      logger.debug("Transcoding complete. New file:", fileToUpload.name);
      setUploadState("loading");
    }

    try {
      logger.debug("Start upload - using smart account address:", address, "type:", type);

      const uploadRequestResult = await getLivepeerUploadUrl(
        newAssetTitle || fileToUpload.name || "new file name",
        address
      );

      // Store asset in both state and ref for persistence
      if (uploadRequestResult?.asset) {
        logger.debug("Setting livepeer asset:", uploadRequestResult.asset);
        setLivepeerAsset(uploadRequestResult.asset);
        livepeerAssetRef.current = uploadRequestResult.asset;
      } else {
        logger.error("No asset in upload request result");
        setError("Failed to get asset information");
        setUploadState("idle");
        return;
      }

      const tusUpload = new tus.Upload(fileToUpload, {
        endpoint: uploadRequestResult?.tusEndpoint,
        metadata: {
          filename: fileToUpload.name,
          // Validation should ensure type is always present, but use safe fallback as defensive measure
          filetype: fileToUpload.type || "application/octet-stream",
        },
        uploadSize: fileToUpload.size,
        onError(err: any) {
          logger.error("Error uploading file:", err);
          setError("Failed to upload file. Please try again.");
          setUploadState("idle");
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(percentage);
        },
        onSuccess() {
          logger.debug("Upload completed");
          setUploadComplete(true);
          setUploadState("complete");

          // Ensure asset is still in ref
          if (uploadRequestResult?.asset) {
            livepeerAssetRef.current = uploadRequestResult.asset;
          }

          if (uploadRequestResult?.asset?.id) {
            onFileUploaded(uploadRequestResult.asset.id);

            void (async () => {
              try {
                const metadataUri = await pollForMetadataUri(uploadRequestResult.asset.id);
                setUploadedUri(metadataUri);
              } catch (pollErr) {
                logger.warn("Failed to resolve metadata URI:", pollErr);
              }
            })();

            if (onAssetReady && uploadRequestResult?.asset) {
              onAssetReady(uploadRequestResult.asset);
            }
          } else {
            setError("Upload succeeded but asset ID is missing.");
          }
        },
      });

      tusUpload.start();
    } catch (err) {
      logger.error("Error uploading file:", err);
      setError("Failed to upload file. Please try again.");
      setUploadState("idle");
    }
  };

  async function handlePostUploadDbUpdate(assetId: string, dbAssetId: number) {
    setIsPolling(true);
    try {
      const metadataUri = await pollForMetadataUri(assetId);
      await updateVideoAsset(dbAssetId, {
        metadata_uri: metadataUri,
        thumbnailUri: "", // update as needed
        status: "draft",
        max_supply: null,
        price: null,
        royalty_percentage: null,
      });
      toast.success("Database updated with metadata URI!");
    } catch (err) {
      toast.error("Failed to update database with metadata URI");
      logger.error(err);
    } finally {
      setIsPolling(false);
    }
  }

  // Show loading state while fetching account
  if (loading) {
    return (
      <div className="text-center p-8">
        <p className="text-foreground">Loading your wallet...</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="text-center p-8">
        <p className="text-foreground">Please connect your wallet to upload videos</p>
      </div>
    );
  }

  return (
    <div className="w-full" id="upload-video-form">
      <div className="flex flex-col space-y-6">
        <div className="space-y-6 sm:space-y-8">
          {/* File Input */}
          <div className="space-y-2">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-foreground"
            >
              Choose A File To Upload:
            </label>
            <input
              type="file"
              id="file-upload"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-flv,video/mp2t,.mp4,.mov,.mkv,.webm,.flv,.ts"
              className="file:border-1 block w-full rounded-lg border border-input bg-background text-sm text-[#EC407A] 
              file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-card file:px-3 file:py-2 file:text-xs 
              sm:file:mr-4 sm:file:px-4 sm:file:text-sm file:font-semibold file:text-[#EC407A] hover:file:bg-accent"
              data-testid="file-upload-input"
              onChange={handleFileChange}
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                📹 Supported formats: MP4, MOV, MKV, WebM, FLV, TS
              </p>
              <p className="text-xs text-muted-foreground">
                ✅ <strong>Required codecs:</strong> H.264 or H.265 (HEVC) • Max size: 5GB
              </p>
            </div>
          </div>

          {/* Selected File Section */}
          {selectedFile && (
            <div className="space-y-6 sm:space-y-8">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Selected File
                </p>
                <p className="mt-1 text-sm text-foreground break-words sm:text-base">
                  {selectedFile.name}
                </p>
              </div>

              {/* Video Preview */}
              <div className="overflow-hidden rounded-lg border border-border">
                <PreviewVideo video={selectedFile} />
              </div>

              {/* Upload Controls */}
              <div className="flex flex-col items-center space-y-4">
                {uploadState === "idle" ? (
                  <button
                    onClick={handleFileUpload}
                    disabled={!selectedFile}
                    className={`${!selectedFile
                      ? "cursor-not-allowed bg-[#D63A6A] opacity-50"
                      : "bg-[#EC407A] hover:bg-[#D63A6A] active:bg-[#C62C5A]"
                      } w-full max-w-xs rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors sm:px-6 sm:text-base touch-manipulation`}
                    data-testid="file-input-upload-button"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    Upload File
                  </button>
                ) : (
                  <div className="w-full max-w-md space-y-2">
                    <Progress
                      value={uploadState === "transcoding" ? transcodeProgress : progress}
                      max={100}
                      className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className={`h-full transition-all duration-500 ease-in-out ${uploadState === "transcoding" ? "bg-amber-500" : "bg-[#EC407A]"
                          }`}
                        style={{ width: `${uploadState === "transcoding" ? transcodeProgress : progress}%` }}
                      />
                    </Progress>
                    <p className="text-center text-xs text-muted-foreground sm:text-sm">
                      {uploadState === "complete"
                        ? "Upload Complete!"
                        : uploadState === "transcoding"
                          ? `Converting video format... ${transcodeProgress}%`
                          : `${progress}% uploaded`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadedUri && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 dark:bg-green-500/5 p-4">
              <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <span>File uploaded successfully! IPFS URI:</span>
                <Link
                  href={uploadedUri}
                  target="_blank"
                  className="text-green-600 dark:text-green-400 underline hover:text-green-800 dark:hover:text-green-300"
                >
                  {truncateUri(uploadedUri)}
                </Link>
                <button
                  onClick={() => copyToClipboard(uploadedUri)}
                  className="inline-flex items-center gap-1 rounded-md p-1 text-green-600 dark:text-green-400 hover:bg-green-500/20 dark:hover:bg-green-500/10 hover:text-green-800 dark:hover:text-green-300"
                >
                  <CopyIcon className="h-4 w-4" />
                  <span className="text-xs">Copy</span>
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      {!hideNavigation && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onPressBack && (
            <Button
              variant="outline"
              disabled={uploadState === "loading" || uploadState === "transcoding"}
              onClick={onPressBack}
              className="w-full min-w-[120px] text-sm sm:w-auto sm:text-base touch-manipulation"
            >
              Back
            </Button>
          )}
          {onPressNext && (
            <Button
              disabled={uploadState !== "complete"}
              onClick={() => {
                // Use ref as fallback if state is lost
                const asset = livepeerAsset || livepeerAssetRef.current;
                logger.debug('Next clicked - Asset data:', {
                  hasState: !!livepeerAsset,
                  hasRef: !!livepeerAssetRef.current,
                  assetId: asset?.id
                });

                if (asset?.id) {
                  onPressNext(asset);
                } else {
                  logger.error('Missing asset data:', {
                    state: livepeerAsset,
                    ref: livepeerAssetRef.current
                  });
                  toast.error("Video data is missing. Please try uploading again.");
                }
              }}
              data-testid="file-input-next"
              className="w-full min-w-[120px] text-sm sm:w-auto sm:text-base touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Next
            </Button>
          )}
        </div>
      )}

      {isPolling && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          Processing video and syncing metadata...
        </div>
      )}
    </div>
  );
};

export default FileUpload;
