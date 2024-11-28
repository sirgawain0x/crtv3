'use client';

import { FaExclamationTriangle } from 'react-icons/fa';
import { use, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { STEPPER_FORM_KEYS } from '@app/lib/utils/context';
import {
  StepperFormKeysType,
  StepperFormValues,
} from '@app/types/hook-stepper';

import StepperIndicator from '@app/components/Stepper-Indicator';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '@app/components/ui/button';
import { toast } from 'sonner';
import CreateInfo from './Create-info';
import CreateThumbnail from './Create-thumbnail';
import type { TVideoMetaForm } from './Create-info';
import FileUpload from './FileUpload';

import { hasCreatorPass } from '@app/api/auth/thirdweb/gateCondition';
import { isLoggedIn } from '@app/components/Button/actions/login';

import {
  useActiveAccount,
} from "thirdweb/react";

import { useRouter } from 'next/navigation';
import { metadata } from '@app/layout';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [canNextStep, setCanNextStep] = useState(false);
  const [erroredInputName, setErroredInputName] = useState('');

  const methods = useForm<StepperFormValues>({
    mode: 'onTouched',
  });
  
  const [metadata, setMetadata] = useState<TVideoMetaForm>(),
            [livepeerAsset, setLivepeerAsset] = useState<any>(),
              [subtitlesUri, setSubtitlesUri] = useState<string>();

  const { insert, assetMetadataModelId } = useOrbisContext();

  const activeAccount = useActiveAccount();

  const router = useRouter();

  // TODO: Replace with next-auth token gating or debug hasCreatorPass (cannot rely on activeAccount?.address due to delay in load times)
  useEffect(() => {
    // const tokenGate = async () => {
    //   if (!(await isLoggedIn()) || !activeAccount /* || !(await hasCreatorPass()) */ )  {
    //     console.log({ 
    //       isLoggedIn: !(await isLoggedIn()), 
    //       activeAccount: !activeAccount, 
    //       // hasCreatorPass: !(await hasCreatorPass(activeAccount?.address))}
    //     });
    //     router.push("/");
    //   }
    // }
    // tokenGate();
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
          onFileSelect={(file) => {
            console.log('Selected file:', file); // Debugging line
          }}
          onFileUploaded={(videoUrl: string) => {
            console.log('Uploaded video URL:', videoUrl); // Debugging line
          }}
          onUploadSuccess={(subtitlesUri?: string) => {
            // console.log('onUploadSuccess', { subtitlesUri })
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
        {/* <code>
          <pre>{JSON.stringify(metadata, null, 2)}</pre>
        </code>
        <code>
          <span>Livepeer asset id: {livepeerAsset?.id}</span>
        </code> */}
        <CreateThumbnail 
          livePeerAssetId={livepeerAsset?.id}
          onThumbnailSuccess={async (thumbnailUri: string) => {
            console.log('onThumbnailSuccess', { thumbnailUri });
            
            const assetMetadata: AssetMetadata = {
              assetId: livepeerAsset?.id as string,
              playbackId: livepeerAsset?.playbackId as string,
              title: metadata?.title as string,
              description: metadata?.description as string,
              ...(metadata?.location !== undefined && { location: metadata?.location }),
              ...(metadata?.category !== undefined && { category: metadata?.category }),
              ...(thumbnailUri !== undefined && { thumbnailUri }),
              ...(subtitlesUri !== undefined && { subtitlesUri }),
            };
            
            console.log({ assetMetadata });
            
            const metadataUri = await insert(
              {
                ...assetMetadata,
                thumbnailUri,
                subtitlesUri
              },
              assetMetadataModelId
            );

            console.log('metadataUri', metadataUri);
          }} />
      </div>

      {/* </form>
      </FormProvider> */}
    </>
  );
};

export default HookMultiStepForm;
