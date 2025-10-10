"use client";
import React, { useState, useRef } from "react";
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
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "loading" | "complete"
  >("idle");

  const [livepeerAsset, setLivepeerAsset] = useState<any>();
  const [isPolling, setIsPolling] = useState(false);
  
  // Use ref to persist asset data across re-renders
  const livepeerAssetRef = useRef<any>(null);

  // Use Universal Account to get smart account address (SCA), not controller wallet
  const { address, type, loading } = useUniversalAccount();

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

  const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
    // Check file extension
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension);
    
    // Check MIME type
    const isValidMimeType = SUPPORTED_VIDEO_FORMATS.includes(file.type);
    
    if (!isValidExtension && !isValidMimeType) {
      return {
        valid: false,
        error: `Unsupported video format: ${fileExtension}. Please use MP4, MOV, MKV, WebM, FLV, or TS format with H.264/H.265 codec.`,
      };
    }

    // Check file size (optional: 5GB limit)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 5GB limit. Please compress your video or use a smaller file.',
      };
    }

    return { valid: true };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validate video file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid video file');
      setSelectedFile(null);
      onFileSelect(null);
      toast.error(validation.error || 'Invalid video file');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
    console.log("Selected file:", file?.name, "Address:", address, "Type:", type);
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

    try {
      console.log("Start upload - using smart account address:", address, "type:", type);

      const uploadRequestResult = await getLivepeerUploadUrl(
        newAssetTitle || selectedFile.name || "new file name",
        address
      );

      // Store asset in both state and ref for persistence
      if (uploadRequestResult?.asset) {
        console.log("Setting livepeer asset:", uploadRequestResult.asset);
        setLivepeerAsset(uploadRequestResult.asset);
        livepeerAssetRef.current = uploadRequestResult.asset;
      } else {
        console.error("No asset in upload request result");
        setError("Failed to get asset information");
        setUploadState("idle");
        return;
      }

      const tusUpload = new tus.Upload(selectedFile, {
        endpoint: uploadRequestResult?.tusEndpoint,
        metadata: {
          filename: selectedFile.name,
          filetype: selectedFile.type || "video/mp4", // Use actual file MIME type
        },
        uploadSize: selectedFile.size,
        onError(err: any) {
          console.error("Error uploading file:", err);
          setError("Failed to upload file. Please try again.");
          setUploadState("idle");
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(percentage);
        },
        onSuccess() {
          console.log("Upload completed");
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
                console.warn("Failed to resolve metadata URI:", pollErr);
              }
            })();
          } else {
            setError("Upload succeeded but asset ID is missing.");
          }
        },
      });

      tusUpload.start();
    } catch (err) {
      console.error("Error uploading file:", err);
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
      console.error(err);
    } finally {
      setIsPolling(false);
    }
  }

  // Show loading state while fetching account
  if (loading) {
    return (
      <div className="text-center p-8">
        <p>Loading your wallet...</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="text-center p-8">
        <p>Please connect your wallet to upload videos</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-4xl flex-col px-2 py-4 sm:px-4 sm:py-8">
        <div className="flex-1 rounded-lg bg-white p-4 shadow-lg sm:p-8">
          <h1 className="mb-6 text-center text-xl font-semibold text-gray-900 sm:mb-8 sm:text-2xl">
            Upload A File
          </h1>

          <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
            {/* File Input */}
            <div className="space-y-2">
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-gray-700"
              >
                Choose A File To Upload:
              </label>
              <input
                type="file"
                id="file-upload"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-flv,video/mp2t,.mp4,.mov,.mkv,.webm,.flv,.ts"
                className="file:border-1 block w-full rounded-lg border border-gray-200 text-sm text-[#EC407A] 
                file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs 
                sm:file:mr-4 sm:file:px-4 sm:file:text-sm file:font-semibold file:text-[#EC407A] hover:file:bg-gray-50"
                data-testid="file-upload-input"
                onChange={handleFileChange}
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 font-medium">
                  📹 Supported formats: MP4, MOV, MKV, WebM, FLV, TS
                </p>
                <p className="text-xs text-gray-500">
                  ✅ <strong>Required codecs:</strong> H.264 or H.265 (HEVC) • Max size: 5GB
                </p>
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  ⚠️ <strong>Important:</strong> Your video must use H.264 or H.265 codec. If upload fails, convert your video using <a href="https://handbrake.fr/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">HandBrake</a> or FFmpeg.
                </p>
              </div>
            </div>

            {/* Selected File Section */}
            {selectedFile && (
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">
                    Selected File
                  </p>
                  <p className="mt-1 text-sm text-gray-900 break-words sm:text-base">
                    {selectedFile.name}
                  </p>
                </div>

                {/* Video Preview */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <PreviewVideo video={selectedFile} />
                </div>

                {/* Upload Controls */}
                <div className="flex flex-col items-center space-y-4">
                  {uploadState === "idle" ? (
                    <button
                      onClick={handleFileUpload}
                      disabled={!selectedFile}
                      className={`${
                        !selectedFile
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
                        value={progress}
                        max={100}
                        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                      >
                        <div
                          className="h-full bg-[#EC407A] transition-all duration-500 ease-in-out"
                          style={{ width: `${progress}%` }}
                        />
                      </Progress>
                      <p className="text-center text-xs text-gray-600 sm:text-sm">
                        {uploadState === "complete"
                          ? "Upload Complete!"
                          : `${progress}% uploaded`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {uploadedUri && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm text-green-700">
                  <span>File uploaded successfully! IPFS URI:</span>
                  <Link
                    href={uploadedUri}
                    target="_blank"
                    className="text-green-600 underline hover:text-green-800"
                  >
                    {truncateUri(uploadedUri)}
                  </Link>
                  <button
                    onClick={() => copyToClipboard(uploadedUri)}
                    className="inline-flex items-center gap-1 rounded-md p-1 text-green-600 hover:bg-green-100 hover:text-green-800"
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
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onPressBack && (
            <Button
              variant="outline"
              disabled={uploadState === "loading"}
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
                console.log('Next clicked - Asset data:', { 
                  hasState: !!livepeerAsset, 
                  hasRef: !!livepeerAssetRef.current,
                  assetId: asset?.id
                });
                
                if (asset?.id) {
                  onPressNext(asset);
                } else {
                  console.error('Missing asset data:', { 
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

        {isPolling && (
          <div className="text-center text-sm text-gray-500 mt-4">
            Processing video and syncing metadata...
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
