import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useForm } from 'react-hook-form';
import { MetokenFormData } from '@app/types/metoken';
import CreateMetokenButton from './CreateMetokenButton';
import { gql } from 'graphql-request';
import { hyperindexClient } from '@app/lib/sdk/hyperindex/client';
import { useEffect } from 'react';

const DIAMOND_ADDRESS = '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B';

const GET_METOKEN_SUBSCRIPTIONS = gql`
  query GetMetokenSubscriptions($owner: String!) {
    Metokens_Subscribe(where: { owner: { _eq: $owner } }) {
      asset
      assetsDeposited
      hubId
      id
      meToken
      minted
      name
      owner
      symbol
      db_write_timestamp
    }
  }
`;

export default function MetokenStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(
    null,
  );
  const activeAccount = useActiveAccount();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MetokenFormData>({
    defaultValues: {
      owner: activeAccount?.address || '',
      diamond: DIAMOND_ADDRESS,
    },
  });

  // Query existing subscriptions
  useEffect(() => {
    async function fetchSubscriptions() {
      if (!activeAccount?.address) return;

      setSubscriptionLoading(true);
      try {
        const data = await hyperindexClient.request(GET_METOKEN_SUBSCRIPTIONS, {
          owner: activeAccount.address.toLowerCase(),
        });
        setSubscriptionData(data);
      } catch (error) {
        setSubscriptionError(
          error instanceof Error
            ? error
            : new Error('Failed to fetch subscriptions'),
        );
      } finally {
        setSubscriptionLoading(false);
      }
    }

    fetchSubscriptions();
  }, [activeAccount?.address]);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 1: Create Your Metoken</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Owner Address
                </label>
                <input
                  value={activeAccount?.address}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Token Name
                </label>
                <input
                  {...register('name', { required: 'Token name is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Token Symbol
                </label>
                <input
                  {...register('symbol', {
                    required: 'Token symbol is required',
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.symbol && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.symbol.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Diamond Address
                </label>
                <input
                  {...register('diamond')}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <CreateMetokenButton
                name={watch('name')}
                symbol={watch('symbol')}
                diamond={watch('diamond')}
                onSuccess={() => setActiveStep(1)}
              />
            </form>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 2: Subscribe to Metokens</h2>

            {subscriptionLoading ? (
              <div>Loading subscriptions...</div>
            ) : subscriptionError ? (
              <div>
                Error loading subscriptions: {subscriptionError.message}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Your Current Subscriptions
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {subscriptionData?.Metokens_Subscribe.map((sub: any) => (
                    <div key={sub.id} className="rounded-lg border p-4">
                      <p>
                        <strong>Name:</strong> {sub.name}
                      </p>
                      <p>
                        <strong>Symbol:</strong> {sub.symbol}
                      </p>
                      <p>
                        <strong>Assets Deposited:</strong> {sub.assetsDeposited}
                      </p>
                      <p>
                        <strong>Minted:</strong> {sub.minted}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveStep(0)}
                  className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Create Another Metoken
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                activeStep >= 0 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              1
            </div>
            <div className="mx-4 h-1 flex-1 bg-gray-200">
              <div
                className={`h-full ${
                  activeStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            </div>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                activeStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              2
            </div>
          </div>
        </div>
      </div>

      {renderStep()}
    </div>
  );
}
