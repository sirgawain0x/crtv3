'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaExclamationTriangle } from 'react-icons/fa';

import { toast } from 'sonner';
import { useActiveAccount } from 'thirdweb/react';
import { Asset } from 'livepeer/models/components';
import Link from 'next/link';
import {
  StepperFormKeysType,
  StepperFormValues,
} from '@app/types/hook-stepper';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { hasAccess } from '@app/api/auth/thirdweb/gateCondition';
import StepperIndicator from '@app/components/Stepper-Indicator';
import { authedOnly } from '@app/api/auth/thirdweb/authentication';
import FileUpload from '@app/components/Videos/Upload/FileUpload';
import CreateInfo from '@app/components/Videos/Upload/Create-info';
import CreateThumbnail from '@app/components/Videos/Upload/Create-thumbnail';
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import type { TVideoMetaForm } from '@app/components/Videos/Upload/Create-info';
import { STEPPER_FORM_KEYS } from '@app/lib/utils/context';
import {
  AssetMetadata,
  createAssetMetadata,
} from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { stack } from '@app/lib/sdk/stack/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@app/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@app/components/ui/button';
import LazyMintModal from '@app/components/lazy-mint-modal/LazyMintModal';

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [erroredInputName, setErroredInputName] = useState('');
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    points: number;
    videoTitle: string;
  } | null>(null);

  const methods = useForm<StepperFormValues>({
    mode: 'onTouched',
  });

  const [metadata, setMetadata] = useState<TVideoMetaForm>();
  const [livepeerAsset, setLivepeerAsset] = useState<Asset>();
  const [subtitlesUri, setSubtitlesUri] = useState<string>();
  const [thumbnailUri, setThumbnailUri] = useState<string>();

  const { insert, isConnected } = useOrbisContext();

  const activeAccount = useActiveAccount();

  const router = useRouter();

  useEffect(() => {
    const tokenGate = async (address: string) => {
      try {
        const [isAuthed, hasUserAccess, isUserConnected] = await Promise.all([
          authedOnly(),
          hasAccess(address),
          isConnected(address),
        ]);

        if (!isAuthed || !hasUserAccess || !isUserConnected) {
          toast.error(
            'Access denied. Please ensure you are connected and have an active Creator Pass in your wallet.',
          );
          router.push('/');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        toast.error('Failed to verify access. Please try again.');
        router.push('/');
      }
    };
    if (!activeAccount?.address) {
      toast.error('Please connect your wallet');
      router.push('/');
      return;
    }
    tokenGate(activeAccount.address);
  }, [activeAccount, isConnected, router]);

  const {
    trigger,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  // focus errored input on submit
  useEffect(() => {
    const erroredInputElement =
      document.getElementsByName(erroredInputName)?.[0];
    if (erroredInputElement instanceof HTMLInputElement) {
      erroredInputElement.focus();
      setErroredInputName('');
    }
  }, [erroredInputName]);

  const handleCreateInfoSubmit = (data: TVideoMetaForm) => {
    setMetadata(data);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleFinalSubmission = async () => {
    if (!livepeerAsset || !metadata) {
      toast.error('Error saving asset: Missing asset metadata');
      return;
    }

    try {
      const assetMetadata: AssetMetadata = createAssetMetadata(
        livepeerAsset,
        metadata,
        thumbnailUri,
        subtitlesUri,
      );

      await insert(
        process.env.NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID as string,
        assetMetadata,
      );

      // Award points for uploading a video
      await stack.track('video_upload', {
        account: activeAccount?.address as string,
        points: 10,
      });

      // Get updated points balance
      const pointsResult = await stack.getPoints(
        activeAccount?.address as string,
      );

      // Handle both possible return types from getPoints
      const points = Array.isArray(pointsResult)
        ? pointsResult.reduce((total, p) => total + p.amount, 0)
        : pointsResult;

      setUploadStats({
        points,
        videoTitle: metadata.title,
      });
      
      // Make sure to set this to true to show the success dialog
      setIsUploadComplete(true);
    } catch (error) {
      console.error('Error during final submission:', error);
      toast.error('Failed to complete upload');
    }
  };

  const handleViewVideo = () => {
    router.push('/discover');
  };

  const handleUploadAnother = () => {
    setIsUploadComplete(false);
    setUploadStats(null);
    // Reset form states
    setActiveStep(1);
    setMetadata(undefined);
    setLivepeerAsset(undefined);
    setSubtitlesUri(undefined);
    setThumbnailUri(undefined);
  };

  return (
    <>
      <StepperIndicator activeStep={activeStep} />
      {errors.root?.formError && (
        <Alert variant="destructive" className="mt-[28px]">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription>{errors.root.formError.message}</AlertDescription>
        </Alert>
      )}

      <div className="mt-[28px] min-h-[60vh]">
        {activeStep === 1 && (
          <CreateInfo onPressNext={handleCreateInfoSubmit} />
        )}
        {activeStep === 2 && (
          <FileUpload
            newAssetTitle={metadata?.title}
            metadata={metadata}
            onFileSelect={(file) => {}}
            onFileUploaded={(videoUrl: string) => {}}
            onSubtitlesUploaded={(subtitlesUri?: string) => {
              setSubtitlesUri(subtitlesUri);
            }}
            onPressBack={() =>
              setActiveStep((prevActiveStep) => prevActiveStep - 1)
            }
            onPressNext={(livepeerAsset: any) => {
              setLivepeerAsset(livepeerAsset);
              setActiveStep((prevActiveStep) => prevActiveStep + 1);
            }}
          />
        )}
        {activeStep === 3 && (
          <CreateThumbnail
            livePeerAssetId={livepeerAsset?.id}
            thumbnailUri={thumbnailUri}
            onComplete={handleFinalSubmission}
            onThumbnailSelect={(uri: string) => {
              setThumbnailUri(uri);
            }}
          />
        )}
      </div>

      <Dialog open={isUploadComplete} onOpenChange={setIsUploadComplete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Upload Complete!
            </DialogTitle>
            <DialogDescription>
              <div className="mt-4 space-y-2">
                <p>{`Your video "${uploadStats?.videoTitle || ''}" has been successfully uploaded!`}</p>
                <p className="font-semibold text-green-600">
                  You earned 10 points! Your total balance is now{' '}
                  {uploadStats?.points} points.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button onClick={() => setShowMintModal(true)} variant="secondary" className="flex-1">
              Mint as NFT
            </Button>
            <Button onClick={handleViewVideo} className="flex-1">
              View Your Video
            </Button>
            <Button variant="outline" onClick={handleUploadAnother} className="flex-1">
              Upload Another Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showMintModal && (
        <LazyMintModal
          baseURIForToken={livepeerAsset?.playbackId || ''}
          toggleModal={() => setShowMintModal(false)}
        />
      )}
      {isUploadComplete && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-semibold">Upload Complete!</h2>
          <p className="text-gray-600">
            Your video is now being processed and will be available soon.
          </p>
        </div>
      )}
    </>
  );
};

export default HookMultiStepForm;
