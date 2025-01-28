'use client';
import {
  getLivepeerAsset,
  getLivepeerPlaybackInfo,
} from '@app/api/livepeer/livepeerActions';
import LazyMint from '@app/components/lazy-mint/LazyMint';
import { PlayerComponent, PlayerLoading } from '@app/components/Player/Player';
import { Button } from '@app/components/ui/button';
import { Spinner } from '@chakra-ui/react';
import { Src } from '@livepeer/react';
import { getSrc } from '@livepeer/react/external';
import { Asset, PlaybackInfo } from 'livepeer/models/components';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import CreateThumbnailForm from './CreateThumbnailForm';
import { toast } from 'sonner';
import Skeleton from '@app/components/ui/skeleton';
import { useInterval } from 'react-use';

type CreateThumbnailProps = {
  livePeerAssetId: string | undefined;
  thumbnailUri?: string;
  onComplete?: () => void;
  onThumbnailSelect?: (uri: string) => void;
};

export default function CreateThumbnail({
  livePeerAssetId,
  thumbnailUri,
  onComplete,
  onThumbnailSelect,
}: CreateThumbnailProps) {
  const router = useRouter();
  const activeAccount = useActiveAccount();

  const [progress, setProgress] = useState<number>(0);
  const [livepeerAssetData, setLivepeerAssetData] = useState<Asset>();
  const [livepeerPlaybackData, setLivepeerPlaybackData] =
    useState<PlaybackInfo>();
  const [isLazyMinted, setIsLazyMinted] = useState(false);
  const [selectedThumbnailUri, setSelectedThumbnailUri] = useState<string>('');
  const [completionData, setCompletionData] = useState<{ thumbnailUri: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const onLazyMintSuccess = (txHash: string) => {
    if (selectedThumbnailUri) {
      handleFinalSubmission();
    }
  };

  useInterval(
    () => {
      if (livePeerAssetId) {
        getLivepeerAsset(livePeerAssetId)
          .then((data) => {
            console.log(data);
            setLivepeerAssetData(data);
          })
          .catch((e) => {
            console.log(e);
            alert(e?.message || 'Error retrieving livepeer asset');
          });
      }
      if (livepeerAssetData?.status?.phase === 'failed') {
        throw new Error(
          'Error transcoding video: ' + livepeerAssetData?.status?.errorMessage,
        );
      }
    },
    livepeerAssetData?.status?.phase !== 'ready' &&
      livepeerAssetData?.status?.phase !== 'failed'
      ? 5000
      : null,
  );

  useEffect(() => {
    if (
      livepeerAssetData?.status?.phase === 'ready' &&
      livepeerAssetData.playbackId
    ) {
      getLivepeerPlaybackInfo(livepeerAssetData.playbackId).then((data) => {
        setLivepeerPlaybackData(data);
      });
    } else {
      console.log('Not ready to get playback info');
    }
  }, [livepeerAssetData]);

  const handleFinalSubmission = useCallback(async () => {
    if (!selectedThumbnailUri) {
      toast.error('Please select a thumbnail first');
      return;
    }
    if (!activeAccount) {
      toast.error('No active account found. Please connect your wallet.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call the parent's onComplete callback with the selected thumbnail URI
      if (onComplete) {
        onComplete();
      }
      
      setIsCompleted(true);
      // Don't show success toast here since parent will show it
      
      // Don't redirect here - let the parent handle navigation
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to complete upload. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedThumbnailUri, activeAccount, onComplete]);

  const handleBack = () => {
    router.back();
  };

  const handleThumbnailSelect = (uri: string) => {
    setSelectedThumbnailUri(uri);
    if (onThumbnailSelect) {
      onThumbnailSelect(uri);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="my-6 text-center">
        <h2 className="text-2xl font-bold">Create Thumbnail</h2>
        <p className="mt-2 text-gray-600">
          Generate or upload a thumbnail for your video
        </p>
      </div>

      {!livepeerAssetData && (
        <div className="mb-8 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-7 w-40" /> {/* Title skeleton */}
            <Skeleton className="w-full aspect-video rounded-lg" /> {/* Video skeleton */}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-7 w-48" /> {/* Form section title */}
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" /> {/* Form input */}
              <Skeleton className="h-10 w-full" /> {/* Form input */}
            </div>
          </div>
        </div>
      )}

      {livepeerAssetData?.status?.phase === 'ready' && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">Preview</h3>
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
            {livepeerPlaybackData && livePeerAssetId ? (
              <PlayerComponent
                src={getSrc(livepeerPlaybackData)}
                assetId={livePeerAssetId}
                title={livepeerAssetData.name}
                onPlay={() => {}}
              />
            ) : (
              <div className="h-full w-full">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {livepeerAssetData?.status?.phase === 'processing' && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold">Processing Video</h3>
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
            <div className="flex h-full w-full flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Spinner size="xl" className="text-primary" />
                <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-full" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">Processing Video</p>
                <p className="text-sm text-gray-600">
                  Your video is being processed. This may take a few minutes...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {livepeerAssetData?.status?.phase === 'failed' && (
        <div className="mb-8">
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Processing Failed</h3>
                <p className="mt-2 text-sm text-red-700">
                  {livepeerAssetData?.status?.errorMessage || 'An error occurred while processing your video.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <CreateThumbnailForm
          onSelectThumbnailImages={(imageUrl) => {
            handleThumbnailSelect(imageUrl);
          }}
        />
        
        <div className="flex justify-end space-x-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
          >
            Back
          </Button>
          <Button
            onClick={() => {
              if (!selectedThumbnailUri) {
                toast.error('Please select a thumbnail first');
                return;
              }
              if (activeAccount) {
                onLazyMintSuccess('txHash');
              } else {
                toast.error('No active account found. Please connect your wallet.');
              }
            }}
            disabled={!selectedThumbnailUri || isSubmitting || isCompleted}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Spinner size="sm" className="mr-2" />
                Completing Upload...
              </span>
            ) : isCompleted ? (
              'Upload Completed'
            ) : (
              'Complete Upload'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
