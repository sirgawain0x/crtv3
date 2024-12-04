'use client';

import {
  StepperFormKeysType,
  StepperFormValues,
} from '@app/types/hook-stepper';
import { toast } from 'sonner';
import FileUpload from './FileUpload';
import CreateInfo from './Create-info';
import { useRouter } from 'next/navigation';
import CreateThumbnail from './Create-thumbnail';
import { use, useEffect, useState } from 'react';
import { useActiveAccount } from "thirdweb/react";
import type { TVideoMetaForm } from './Create-info';
import { FaExclamationTriangle } from 'react-icons/fa';
import { FormProvider, useForm } from 'react-hook-form';
import { STEPPER_FORM_KEYS } from '@app/lib/utils/context';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import StepperIndicator from '@app/components/Stepper-Indicator';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { hasAccess } from '@app/api/auth/thirdweb/gateCondition';
import { AssetMetadata, createAssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { authedOnly } from '@app/api/auth/thirdweb/authentication';
import { Asset } from 'livepeer/models/components';

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [canNextStep, setCanNextStep] = useState(false);
  const [erroredInputName, setErroredInputName] = useState('');

  const methods = useForm<StepperFormValues>({
    mode: 'onTouched',
  });
  
  const [metadata, setMetadata] = useState<TVideoMetaForm>(),
          [livepeerAsset, setLivepeerAsset] = useState<Asset>(),
            [subtitlesUri, setSubtitlesUri] = useState<string>();

  const { insert, assetMetadataModelId, isConnected } = useOrbisContext();

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

  interface SubmitResponse {
    title: string;
    description: string;
  }

  const onSubmit = async (formData: StepperFormValues) => {
    console.log({ formData });
    // simulate api call
    await new Promise<SubmitResponse>((resolve, reject) => {
      setTimeout(() => {
        resolve({
          title: 'Success',
          description: 'Form submitted successfully',
        });
        reject({
          message: 'There was an error submitting form',
        });
      }, 2000);
    })
      .then(({ title, description }) => {
        toast('Title and description');
      })
      .catch(({ message: errorMessage, errorKey }) => {
        if (
          errorKey &&
          Object.values(STEPPER_FORM_KEYS)
            .flatMap((fieldNames) => fieldNames)
            .includes(errorKey)
        ) {
          let erroredStep: number | undefined;
          // get the step number based on input name
          for (const [key, value] of Object.entries(STEPPER_FORM_KEYS)) {
            if (value.includes(errorKey as never)) {
              erroredStep = Number(key);
              break;
            }
          }
          // set active step and error
          if (erroredStep !== undefined) {
            setActiveStep(erroredStep);
            setError(errorKey as StepperFormKeysType, {
              message: errorMessage,
            });
            setErroredInputName(errorKey);
          } else {
            // Handle the case where erroredStep is not found
            console.error('Error: Step not found for the given errorKey');
          }
        } else {
          setError('root.formError', {
            message: errorMessage,
          });
        }
      });
  };
  
  const handleNext = async () => {
    const isStepValid = await trigger(undefined, { shouldFocus: true });
    if (isStepValid) setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

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
              console.error({ livepeerAsset, metadata });
              throw new Error('Error saving assetMetadata: Missing asset metadata');
            } else {
              const assetMetadata: AssetMetadata = createAssetMetadata(livepeerAsset, metadata, thumbnailUri, subtitlesUri)
              console.log({ assetMetadata });
              const metadataUri = await insert(
                assetMetadata,
                assetMetadataModelId
              );
              console.log('metadataUri', metadataUri);
            }
          }} />
      </div>
    </>
  );
};

export default HookMultiStepForm;
