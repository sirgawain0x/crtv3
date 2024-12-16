'use client';
import { useState } from 'react';
import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { prepareContractCall } from 'thirdweb';
import {
  useSendTransaction,
  useReadContract,
  useActiveAccount,
} from 'thirdweb/react';
import {
  metokenFactoryOptimism,
  metokenFactoryBase,
} from '@app/lib/utils/contracts/metokenFactoryContract';
import { metokenDiamondBase } from '@app/lib/utils/contracts/metokenDiamondContract';
import StepperIndicator from '../Stepper-Indicator';
import { toast } from 'sonner';
import { FaSpinner } from 'react-icons/fa';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorBoundary } from 'react-error-boundary';
import type { ErrorInfo } from 'react';
import { SubscribeToMetoken } from './subscribeMetoken';

interface CreateMetokenFormData {
  name: string;
  symbol: string;
  address: string;
}

interface CreateMetokenError {
  code: string;
  message: string;
}

type StepKey = 'name' | 'symbol' | 'address';

const formSchema = z.object({
  name: z.string().min(1).max(50),
  symbol: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z]+$/),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div role="alert" className="rounded bg-red-50 p-4">
    <h3 className="mb-2 font-semibold text-red-800">Something went wrong</h3>
    <pre className="mb-4 text-sm text-red-600">{error.message}</pre>
    <Button onClick={resetErrorBoundary} variant="destructive">
      Try again
    </Button>
  </div>
);

const logError = (error: Error, info: ErrorInfo) => {
  console.error('Error:', error);
  console.error('Component Stack:', info.componentStack);
};

export default function CreateMetoken() {
  const activeAccount = useActiveAccount();
  const [formData, setFormData] = useState<CreateMetokenFormData>({
    name: '',
    symbol: '',
    address: '0xba5502db2aC2cBff189965e991C07109B14eB3f5',
  });

  const { data: isOwner, isPending: isPendingOwner } = useReadContract({
    contract: metokenDiamondBase,
    method: 'isOwner',
    params: [activeAccount?.address!],
  });

  const [isGenerated, setIsGenerated] = useState(false);
  const { mutate: sendTransaction } = useSendTransaction();

  // {
  //   onSuccess: (result: any) => {
  //     setIsGenerated(true);
  //     setFormData(form.getValues());
  //     toast.success('MeToken created successfully!', {
  //       description: `Transaction hash: ${result.transactionHash}`,
  //       action: {
  //         label: 'View Transaction',
  //         onClick: () =>
  //           window.open(
  //             `https://basescan.org/tx/${result.transactionHash}`,
  //             '_blank',
  //           ),
  //       },
  //     });
  //     // Reset form
  //     setActiveStep(1);
  //     form.reset();
  //   },
  //   onError: (error: any) => {
  //     setIsGenerated(false);
  //     toast.error('Error generating MeToken', {
  //       description: error?.message || 'Something went wrong',
  //     });
  //   },
  // }

  // State variables to hold form inputs
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const address = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';

  const form = useForm<CreateMetokenFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      symbol: '',
      address,
    },
  });

  // Handle form submission based on active step
  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formValues = form.getValues();

    if (activeStep === 1) {
      if (!formValues.name) {
        toast.error('Token name is required');
        return;
      }
      handleNext();
    } else if (activeStep === 2) {
      if (!formValues.symbol) {
        toast.error('Token symbol is required');
        return;
      }
      handleNext();
    } else if (activeStep === 3) {
      if (!formValues.address) {
        toast.error('Diamond address is required');
        return;
      }

      try {
        const transaction = prepareContractCall({
          contract: metokenFactoryBase,
          method: 'create',
          params: [formValues.name, formValues.symbol, formValues.address],
        });
        sendTransaction(transaction);
        setIsLoading(false);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Something went wrong';
        toast.error('Transaction preparation failed', {
          description: errorMessage,
        });
        setIsLoading(false);
      }
    }
  };

  // If checking ownership status
  if (isPendingOwner) {
    return <div>Checking MeToken ownership status...</div>;
  }

  // If user is already a MeToken owner, show the SubscribeToMetoken component with form data
  if (isOwner) {
    return (
      <SubscribeToMetoken
        tokenName={formData.name}
        tokenSymbol={formData.symbol}
      />
    );
  }

  // If user is not a MeToken owner, show the create form
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        setActiveStep(1);
        setName('');
        setSymbol('');
      }}
    >
      <div className="mx-auto max-w-md p-4">
        <h2 className="mb-6 text-2xl font-bold">Create Your MeToken</h2>
        {/* Stepper Indicator */}
        <StepperIndicator activeStep={activeStep} />

        <form onSubmit={handleSubmit} className="mt-6">
          {activeStep === 1 && (
            <div className="flex flex-col gap-4">
              <label htmlFor="name" className="font-semibold">
                Token Name
              </label>
              <Input
                type="text"
                id="name"
                {...form.register('name')}
                required
                placeholder="Enter your token name"
              />
            </div>
          )}

          {activeStep === 2 && (
            <div className="flex flex-col gap-4">
              <label htmlFor="symbol" className="font-semibold">
                Token Symbol
              </label>
              <Input
                type="text"
                id="symbol"
                {...form.register('symbol')}
                required
                placeholder="Enter your token symbol (e.g., $MET)"
              />
            </div>
          )}

          {activeStep === 3 && (
            <div className="flex flex-col gap-4">
              <label htmlFor="address" className="font-semibold">
                Diamond Address
              </label>
              <Input
                type="text"
                id="address"
                {...form.register('address')}
                disabled
                required
                placeholder={address}
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex justify-between">
            {activeStep > 1 && (
              <Button type="button" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button type="submit" disabled={isLoading || isGenerated}>
              {activeStep < 3 ? (
                'Next'
              ) : (
                <>
                  {isLoading ? (
                    <>
                      <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : isGenerated ? (
                    'Token Generated'
                  ) : (
                    'Create Metoken'
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ErrorBoundary>
  );
}
