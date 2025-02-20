import useClaimTo from '@app/hooks/useClaimTo';
import { blockExplorer } from '@app/lib/utils/context';
import type { ContractOptions } from 'thirdweb';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useActiveAccount } from 'thirdweb/react';

type TClaimVideoNFTProps = {
  videoContract: Readonly<ContractOptions<any, `0x${string}`>>;
  usage: 'owner' | 'buyer';
  tokenId: number;
};

type TClaimFormData = {
  quantity: number;
  recipient: string;
};

export function ClaimVideoNFT(props: TClaimVideoNFTProps) {
  const activeAccount = useActiveAccount();
  const { handleSubmit, formState, register } = useForm<TClaimFormData>();
  const { claim, error, isLoading } = useClaimTo({
    videoContract: props.videoContract,
  });

  const onSubmit: SubmitHandler<TClaimFormData> = async (data) => {
    try {
      if (!activeAccount?.address) {
        toast.error('Please connect your wallet first');
        return;
      }

      await claim({
        to: data.recipient || activeAccount.address,
        tokenId: props.tokenId,
        quantity: data.quantity,
      });

      toast.success('Successfully claimed NFT!');
    } catch (err) {
      console.error('Claim error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to claim NFT');
    }
  };

  return (
    <div className="my-8">
      <h4 className="mb-1 text-lg text-slate-300">Claim NFT</h4>
      <form
        className="my-4 flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
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
            disabled={isLoading}
          />
          {formState.errors.recipient?.type === 'required' && (
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
            disabled={isLoading}
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
                ${isLoading && `hover: cursor-progress`}
              `}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Claiming...' : ' Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClaimVideoNFT;
