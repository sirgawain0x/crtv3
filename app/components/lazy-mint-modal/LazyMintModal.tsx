import useLazyMint from '@app/hooks/useLazyMint';
import { useToast } from '@chakra-ui/react';
import { SubmitHandler, useForm } from 'react-hook-form';

type TLazyMintFormData = {
  pricePerNFT: number;
  numOfNFT: number;
};

type LazyMintProps = {
  baseURIForToken: string;
  toggleModal: () => void;
};

export default function LazyMintModal(props: LazyMintProps) {
  const {
    handleLazyMint,
    isProcessing,
    error: lazyMintError,
    txnHash,
  } = useLazyMint();

  const toast = useToast();

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

    console.log('handleSetCC::formatData', data);

    try {
      await handleLazyMint({
        amount: data.numOfNFT.toString(),
        price: data.pricePerNFT.toString(),
        baseURIForTokens: props.baseURIForToken,
      });

      if (txnHash) {
        toast({
          title: 'Lazy Minting',
          description: `Minting successful`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error({ handleSetClaimCondition: err });

      toast({
        title: 'Lazy Minting',
        description: `Minting failed: ${lazyMintError?.message}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 h-screen overflow-y-auto bg-black bg-opacity-90">
      <div className="p relative top-96 mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-slate-800">
        <button
          onClick={props.toggleModal}
          className="absolute right-4 top-2 text-gray-600 hover:text-gray-800 focus:outline-none dark:hover:text-gray-200"
        >
          <p className="text-lg font-semibold">&times;</p>
        </button>

        <h2 className="mb-8 text-xl font-bold">
          Enter Number of NFT and Price
        </h2>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(handleSubmitLazyMint)}
        >
          <div className="flex flex-col space-y-1">
            <label
              htmlFor="numOfNFT"
              className="font-light dark:text-slate-400"
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
              disabled={isProcessing}
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
              className="font-light dark:text-slate-400"
            >
              Price per NFT:
            </label>
            <input
              id="pricePerNFT"
              {...register('pricePerNFT', { required: true, min: 0 })}
              className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
              disabled={isProcessing}
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
              disabled={isProcessing}
            >
              {isProcessing ? 'Minting...' : ' Lazy Mint'}
            </button>
            <button
              onClick={props.toggleModal}
              className="min-w-10 rounded bg-gray-600 px-4 py-2 text-white transition duration-300 hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
        {/* TODO: remove after confirmattion */}
        {/* <div className="mt-6 space-x-2 text-sm">
          {lazyMintError && (
            <p className="text-rose-500">{lazyMintError.message}</p>
          )}
        </div> */}
      </div>
    </div>
  );
}
