'use client';

import { FaExclamationTriangle } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { STEPPER_FORM_KEYS } from '@app/lib/utils/context';
import {
  StepperFormKeysType,
  StepperFormValues,
} from '@app/types/hook-stepper';

import StepperIndicator from '@app/components/Stepper-Indicator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../../../components/ui/alert';
import { Button } from '@app/components/ui/button';
import { toast } from 'sonner';
import CreateInfo from './Create-info';
import FileUpload from './FileUpload';

function getStepContent(step: number) {
  switch (step) {
    case 1:
      return <CreateInfo />;
    case 2:
      function setVideoFile(file: File | null) {
        return file;
      }
      function setVideoUrl(url: string) {
        return url;
      }

      return (
        <FileUpload
          onFileSelect={(file) => {
            console.log('Selected file:', file); // Debugging line
            setVideoFile(file);
          }}
          onFileUploaded={(videoUrl: string) => {
            console.log('Uploaded video URL:', videoUrl); // Debugging line
            setVideoUrl(videoUrl);
          }}
        />
      );
    default:
      return 'Unknown step';
  }
}

const HookMultiStepForm = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [erroredInputName, setErroredInputName] = useState('');
  const methods = useForm<StepperFormValues>({
    mode: 'onTouched',
  });

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
          // message: "Field error",
          // errorKey: "fullName",
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
    <div>
      <StepperIndicator activeStep={activeStep} />
      {errors.root?.formError && (
        <Alert variant="destructive" className="mt-[28px]">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription>{errors.root?.formError?.message}</AlertDescription>
        </Alert>
      )}
      <FormProvider {...methods}>
        <form noValidate>
          {getStepContent(activeStep)}
          <div className="mt-5 flex justify-center space-x-[20px]">
            <Button
              type="button"
              className="w-[100px]"
              variant="secondary"
              onClick={handleBack}
              disabled={activeStep === 1}
            >
              Back
            </Button>
            {activeStep === 3 ? (
              <Button
                className="w-[100px]"
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                Submit
              </Button>
            ) : (
              <Button type="button" className="w-[100px]" onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default HookMultiStepForm;
