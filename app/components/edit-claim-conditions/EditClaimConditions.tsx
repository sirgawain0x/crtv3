import {
  claimConditionsOptions,
  timestampToInputDateString,
  formatNumber,
} from '@app/lib/helpers';
import { client } from '@app/lib/sdk/thirdweb/client';
import { videoContract } from '@app/lib/sdk/thirdweb/get-contract';
import { EditonDropContractDeployedChain } from '@app/lib/utils/context';
import type { TVideoContract } from '@app/types/nft';
import { NFT, ResolvedReturnType } from '@app/types/nft';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { sendTransaction, waitForReceipt } from 'thirdweb';
import {
  getClaimConditionById,
  getClaimConditions,
} from 'thirdweb/extensions/erc1155';
import { useActiveAccount } from 'thirdweb/react';
import { ClaimableERC1155 } from 'thirdweb/modules';
import {} from '@app/lib/helpers';

type EditClaimFormData = {
  currency: string;
  phaseName: string;
  maxClaimablePerWallet: string;
  maxClaimableSupply?: string;
  startTimestamp: string;
};

type TUpdateCCParams = {
  tokenId: bigint;
  ccIndex: number;
  formData: EditClaimFormData;
};

type EditClaimConditionsProps = {
  nft: NFT;
  ccIndex: number;
  claimConditions: ResolvedReturnType<ReturnType<typeof getClaimConditions>>;
  videoContract: TVideoContract;
  setCanEditClaim: (arg: number) => void;
};

export default function EditClaimConditions(props: EditClaimConditionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);
  const activeAccount = useActiveAccount();

  const claimCondition = props.claimConditions[props.ccIndex];

  const handleUpdateClaimCondition = async (args: TUpdateCCParams) => {
    // update an existing claimCondition by its id

    if (!activeAccount) {
      throw new Error('No active Wallet connected');
    }

    try {
      const ccById = await getClaimConditionById({
        contract: videoContract,
        tokenId: args.tokenId,
        conditionId: BigInt(args.ccIndex),
      });

      const transaction = ClaimableERC1155.setClaimCondition({
        contract: videoContract,
        tokenId: args.tokenId,
        startTime: new Date(args.formData.startTimestamp),
        pricePerToken: ccById.pricePerToken.toString(),
        currencyAddress: args.formData.currency,
        maxClaimablePerWallet: args.formData.maxClaimablePerWallet,
        maxClaimableSupply: Number(ccById.maxClaimableSupply),
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: activeAccount,
      });

      const receipt = await waitForReceipt({
        client,
        chain: EditonDropContractDeployedChain,
        transactionHash,
      });

      return receipt;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      } else {
        throw err;
      }
    }
  };

  const submitUpdatedCC: SubmitHandler<EditClaimFormData> = async (data) => {
    const { errors } = formState;

    const isRequiredFields =
      errors.maxClaimablePerWallet?.type === 'required' ||
      errors.currency?.type === 'required' ||
      errors.startTimestamp?.type === 'required';

    if (isRequiredFields) {
      return;
    }

    setIsProcessing(true);

    try {
      const receipt = await handleUpdateClaimCondition({
        tokenId: props.nft.id,
        ccIndex: props.ccIndex,
        formData: {
          ...data,
          maxClaimablePerWallet: data.maxClaimablePerWallet,
          startTimestamp: new Date(data.startTimestamp).getTime().toString(),
        },
      });

      console.log({ receipt });
      toast.success('Updating Claims status', {
        description: `Updating successful with ${receipt.status}`,
        duration: 3000,
      });
    } catch (err) {
      setIsProcessing(false);
      setIsError(true);

      toast.error('Updating Claim Conditions', {
        description: (err as Error).message || `Updating failed!`,
        duration: 3000,
      });
    }
  };

  const { handleSubmit, formState, register } = useForm<EditClaimFormData>();

  return (
    <form
      id="updateClaimCondtion"
      className="my-4 flex flex-col gap-4"
      onSubmit={handleSubmit(submitUpdatedCC)}
    >
      <div className="flex flex-col space-y-1">
        <label
          htmlFor="startTimestamp"
          className="my-2 font-medium dark:text-slate-400"
        >
          Start time of Phase
        </label>
        <input
          id="startTimestamp"
          type="datetime-local"
          defaultValue={timestampToInputDateString(
            claimCondition.startTimestamp,
          )}
          {...register('startTimestamp', { required: true })}
          placeholder="Start time of Phase"
          className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
          disabled={isError && isProcessing}
        />
        {formState.errors.startTimestamp?.type === 'required' && (
          <span className="my-4 block text-sm text-red-500">
            When the phase starts (i.e. when users can start claiming tokens).
          </span>
        )}
      </div>

      <div className="flex flex-col space-y-1">
        <label
          htmlFor="currency"
          className="my-2 font-medium dark:text-slate-400"
        >
          Select Payment Currency
        </label>
        <select
          className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
          id="currency"
          {...register('currency')}
          defaultValue={claimCondition.currency}
          aria-invalid={formState.errors.currency ? 'true' : 'false'}
        >
          {Object.keys(claimConditionsOptions.currency).map((k, i) => (
            <option
              key={i}
              value={Object.values(claimConditionsOptions.currency)[i]}
            >
              {k}
            </option>
          ))}
        </select>
        {formState.errors.currency?.type === 'required' && (
          <span className="my-4 block text-sm text-red-500">
            Select a purchasing currency
          </span>
        )}
      </div>

      <div className="flex flex-col space-y-1">
        <label
          htmlFor="maxClaimablePerWallet"
          className="my-2 font-medium dark:text-slate-400"
        >
          Maximum purchase per Wallet
        </label>
        <input
          id="maxClaimablePerWallet"
          type="number"
          {...register('maxClaimablePerWallet', { required: true })}
          defaultValue={claimCondition.quantityLimitPerWallet.toLocaleString()}
          placeholder="The maximum number of tokens a wallet can claim"
          className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
          aria-invalid={
            formState.errors.maxClaimablePerWallet ? 'true' : 'false'
          }
          disabled={isError && isProcessing}
        />
        {formState.errors.maxClaimablePerWallet?.type === 'required' && (
          <span className="my-4 block text-sm text-red-500">
            The maximum number of tokens a wallet can claim.
          </span>
        )}
      </div>

      <div className="mt-4 space-x-8 space-y-3">
        <button
          className={`min-w-10 rounded bg-[--color-brand-red] px-4 py-2 text-white transition duration-300 hover:bg-[--color-brand-red-shade]
                ${isError && isProcessing && `hover: cursor-progress`}
              `}
          type="submit"
          disabled={isError && isProcessing}
        >
          {isError && isProcessing ? 'Updating...' : ' Update'}
        </button>
      </div>
    </form>
  );
}
