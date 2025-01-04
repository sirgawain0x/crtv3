import useLazyMint from '@app/hooks/useLazyMint';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { TSwithButtonChildProps } from '../Button/ToggleSwitch';

export type TLazyMintFormData = {
  pricePerNFT: number;
  numOfNFT: number;
};

type TLazyMintFormProps = {
  baseURIForToken: string;
} & TSwithButtonChildProps;

export default function LazyMintForm(props: TLazyMintFormProps) {
  const {
    handleLazyMint,
    isProcessing,
    error: lazyMintError,
    txnHash,
  } = useLazyMint();

  const { handleSubmit, formState, register } = useForm<TLazyMintFormData>();

  const handleSubmitLazyMint: SubmitHandler<TLazyMintFormData> = async (
    data,
  ) => {
    const { errors } = formState;

    const isRequiredFields =
      errors.pricePerNFT?.type === 'required' ||
      errors.numOfNFT?.type === 'required';

    if (isRequiredFields) {
      return;
    }

    try {
      await handleLazyMint({
        amount: data.numOfNFT.toString(),
        price: data.pricePerNFT.toString(),
        baseURIForTokens: props.baseURIForToken,
      });
      if (txnHash) {
        toast.success('Lazy Minting successful`', {
          description: `Transaction hash: ${txnHash}`,
          action: {
            label: 'View Transaction',
            onClick: () =>
              window.open(`https://basescan.org/tx/${txnHash}`, '_blank'),
          },
        });
      } else {
        throw new Error(`Minting failed: ${lazyMintError?.message}`);
      }
    } catch (err) {
      toast.error('Minting failed', {
        description:
          (err instanceof Error && err.message) || 'Something went wrong',
        duration: 3000,
      });
    }
  };

  return (
    <div className="w-full rounded-lg">
      <h2 className="mb-8 text-xl font-bold">Enter Number of NFT and Price</h2>
      <form className="space-y-6" onSubmit={handleSubmit(handleSubmitLazyMint)}>
        <div className="flex flex-col space-y-1">
          <label
            htmlFor="numOfNFT"
            className="my-2 font-medium dark:text-slate-400"
          >
            Number of NFT:
          </label>
          <input
            type="number"
            id="numOfNFT"
            {...register('numOfNFT', {
              required: true,
              min: 1,
              valueAsNumber: true,
              value: 1,
            })}
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            disabled={isProcessing || Boolean(txnHash)}
          />
          {formState.errors.numOfNFT?.type === 'required' && (
            <span className="my-4 block text-sm text-red-500">
              Number of NFT to mint is required.
            </span>
          )}
          {formState.errors.numOfNFT?.type === 'min' && (
            <span className="my-4 block text-sm text-red-500">
              Number of NFT cannot be less than one.
            </span>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <label
            htmlFor="pricePerNFT"
            className="my-2 font-medium dark:text-slate-400"
          >
            Price per NFT (<span className="font-semibold">$</span>):
          </label>
          <input
            id="pricePerNFT"
            {...register('pricePerNFT', { required: true, min: 0 })}
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            disabled={isProcessing || Boolean(txnHash)}
          />
          {formState.errors.pricePerNFT?.type === 'required' && (
            <span className="mt-4 block text-sm text-red-500">
              The price of the NFT is required.
            </span>
          )}
          {formState.errors.pricePerNFT?.type === 'min' && (
            <span className="mt-4 block text-sm text-red-500">
              The price of the NFT must be greater than zero (0).
            </span>
          )}
        </div>

        <div className="space-x-8 space-y-3">
          <button
            className={`min-w-10 rounded bg-[--color-brand-red] px-4 py-2 text-white transition duration-300 hover:bg-[--color-brand-red-shade]
                ${isProcessing && `hover: cursor-progress`}
              `}
            type="submit"
            disabled={isProcessing || Boolean(txnHash)}
          >
            {isProcessing ? 'Minting...' : ' Lazy Mint'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (props.handleToggleSwitch) {
                props.handleToggleSwitch();
              }
            }}
            className="min-w-10 rounded bg-gray-600 px-4 py-2 text-white transition duration-300 hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
