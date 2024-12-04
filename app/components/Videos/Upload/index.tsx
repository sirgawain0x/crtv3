'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaExclamationTriangle } from 'react-icons/fa';

import { toast } from 'sonner';
import { useActiveAccount } from "thirdweb/react";
import { Asset } from 'livepeer/models/components';

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
import { ASSET_METADATA_MODEL_ID, STEPPER_FORM_KEYS } from '@app/lib/utils/context';
import { AssetMetadata, createAssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [erroredInputName, setErroredInputName] = useState('');

  const methods = useForm<StepperFormValues>({
    mode: 'onTouched',
  });
  
  const [metadata, setMetadata] = useState<TVideoMetaForm>(),
          [livepeerAsset, setLivepeerAsset] = useState<Asset>(),
            [subtitlesUri, setSubtitlesUri] = useState<string>();

  const { insert, isConnected } = useOrbisContext();

  const activeAccount = useActiveAccount();

  const router = useRouter();

  useEffect(() => {
    const tokenGate = async (address: string) => {
      try {
        const [isAuthed, hasUserAccess, isUserConnected] = await Promise.all([
          authedOnly(),
          hasAccess(address),
          isConnected(address)
        ]);
        
        if (!isAuthed || !hasUserAccess || !isUserConnected) {
          toast.error("Access denied. Please ensure you are connected and have an active Creator Pass in your wallet.");
          router.push("/");
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        toast.error("Failed to verify access. Please try again.");
        router.push("/");
      }
    }
    tokenGate(activeAccount?.address);
  }, [activeAccount, router]);

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

  return (
    <>
      <StepperIndicator activeStep={activeStep} />
      {errors.root?.formError && (
        <Alert variant="destructive" className="mt-[28px]">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription>{errors.root?.formError?.message}</AlertDescription>
        </Alert>
      )}
      <div className={activeStep === 1 ? 'block' : 'hidden'}>
        <CreateInfo
          onPressNext={(metadataFormData) => {
            setMetadata(metadataFormData);
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
          }}
        />
      </div>
      <div className={activeStep === 2 ? 'block' : 'hidden'}>
        <FileUpload
          newAssetTitle={metadata?.title}
          metadata={metadata}
          onFileSelect={(file) => {}}
          onFileUploaded={(videoUrl: string) => {}}
          onUploadSuccess={(subtitlesUri?: string) => {
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
      </div>
      <div className={activeStep === 3 ? 'block' : 'hidden'}>
        <CreateThumbnail 
          livePeerAssetId={livepeerAsset?.id}
          onThumbnailSuccess={async (thumbnailUri: string) => {
            console.log('onThumbnailSuccess', { thumbnailUri });
            
            if (!livepeerAsset || !metadata) {
              throw new Error('Error saving assetMetadata: Missing asset metadata');
            } else {
              const assetMetadata: AssetMetadata = createAssetMetadata(livepeerAsset, metadata, thumbnailUri, subtitlesUri)
              const metadataUri = await insert(
                assetMetadata,
                ASSET_METADATA_MODEL_ID
              );
            }
          }} />
      </div>
    </>
  );
};

export default HookMultiStepForm;
