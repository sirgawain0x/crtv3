import useClaimTo from '@app/hooks/useClaimTo';
import { blockExplorer } from '@app/lib/utils/context';
import type { TVideoContract } from '@app/types/nft';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useActiveAccount } from 'thirdweb/react';

type TClaimVideoNFTProps = {
  videoContract: TVideoContract;
  usage: 'owner' | 'buyer'; // Who is using the component
  tokenId: number;
};

type TClaimFormData = {
  quantity: number;
  recipient: string;
};

export default function ClaimVideoNFT(props: TClaimVideoNFTProps) {
  const activeAccount = useActiveAccount();
  const { handleSubmit, formState, register } = useForm<TClaimFormData>();
  const { error, handleClaim, isProcessing } = useClaimTo({
    videoContract: props.videoContract,
  });

  const onSubmitClaim: SubmitHandler<TClaimFormData> = async (data) => {
  
   if (Object.keys(formState.errors).length > 0) {
     return;
   }
   if (!/^0x[a-fA-F0-9]{40}$/.test(data.recipient)) {
     toast.error('Invalid recipient address format');
     return;
   }  

    try {
      const txnHash = await handleClaim({
        quantity: data.quantity,
        tokenId: props.tokenId,
        to: data.recipient,
        videoContract: props.videoContract,
      });

      if (txnHash) {
        toast.success('Claiming successful', {
          description: `Transaction hash: ${txnHash}`,
          duration: 3000,
          action: {
            label: 'View Transaction',
            onClick: () =>
              window.open(
                `${blockExplorer.polygon.amoy}/tx/${txnHash}`,
                '_blank',
              ),
          },
        });
      } else {
        throw new Error(error?.message);
      }
    } catch (err) {
      toast.error('Claiming failed', {
        description: (err as Error).message || 'Something went wrong',
        duration: 3000,
      });
    }
  };

  return (
    <div className="my-8">
      <h4 className="mb-1 text-lg text-slate-300">Claim NFT</h4>
      <form
        className="my-4 flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmitClaim)}
      >
        <div className="flex flex-col space-y-1">
          <label
            htmlFor="recipient"
            className="my-2 font-medium dark:text-slate-400"
          >
            To Address:
          </label>
          <input
            id="recipient"
            {...register('recipient', {
              required: true,
              value: props.usage === 'owner' ? activeAccount?.address : '',
            })}
            placeholder={
              props.usage === 'owner'
                ? activeAccount?.address
                : '0x0000000000000000000000000000000000000000'
            }
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            disabled={isProcessing}
          />
          {formState.errors.quantity?.type === 'required' && (
            <span className="my-4 block text-sm text-red-500">
              Recipient address to is required.
            </span>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <label
            htmlFor="numOfNFT"
            className="my-2 font-medium dark:text-slate-400"
          >
            Number of NFT:
          </label>
          <input
            type="number"
            id="quantity"
            {...register('quantity', {
              required: true,
              min: 1,
              valueAsNumber: true,
              value: 1,
            })}
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            disabled={isProcessing}
          />
          {formState.errors.quantity?.type === 'required' && (
            <span className="my-4 block text-sm text-red-500">
              Number of NFT to mint is required.
            </span>
          )}
          {formState.errors.quantity?.type === 'min' && (
            <span className="my-4 block text-sm text-red-500">
              Number of NFT cannot be less than one.
            </span>
          )}
        </div>

        <div className="mt-4 space-x-8 space-y-3">
          <button
            className={`min-w-10 rounded bg-[--color-brand-red] px-4 py-2 text-white transition duration-300 hover:bg-[--color-brand-red-shade]
                ${isProcessing && `hover: cursor-progress`}
              `}
            type="submit"
            disabled={isProcessing}
          >
            {isProcessing ? 'Claiming...' : ' Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}
