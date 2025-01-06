import {
  claimConditionsOptions,
  timestampToInputDateString,
} from '@app/lib/helpers/helpers';
import { NFT, ResolvedReturnType } from '@app/types/nft';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ContractOptions } from 'thirdweb';
import { getClaimConditions } from 'thirdweb/extensions/erc1155';

type EditClaimFormData = {
  currency: string;
  phaseName: string;
  maxClaimablePerWallet: string;
  maxClaimableSupply?: string;
  startTimestamp: string;
};

type EditClaimConditionsProps = {
  nft: NFT;
  ccIndex: number;
  claimConditions: ResolvedReturnType<ReturnType<typeof getClaimConditions>>;
  videoContract: Readonly<ContractOptions<[]>>;
  setCanEditClaim: (arg: number) => void;
};

export default function EditClaimConditions(props: EditClaimConditionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isErrorFree, setIsErrorFree] = useState(false);

  const claimCondition = props.claimConditions[props.ccIndex];

  const handleUpdateClaimCondition = async (
    tokenId: bigint,
    ccIndex: number,
    formData: EditClaimFormData,
  ): Promise<boolean | undefined> => {
    // update an existing claimCondition by its id
    console.log({ ccIndex, tokenId, ...formData });

    try {
      // TODO: Revisit on how to use the new sdk for this
      // await nftContract?.erc1155.claimConditions.update(tokenId, ccIndex, {
      //   startTime: Number(formData.startTimestamp), // When the phase starts (i.e. when users can start claiming tokens)
      //   maxClaimableSupply: formData.maxClaimableSupply, // limit how many mints for this presale
      //   currencyAddress: formData.currency, // The address of the currency you want users to pay in
      //   maxClaimablePerWallet: formData.maxClaimablePerWallet, // The maximum number of tokens a wallet can claim
      //   metadata: {
      //     name: formData.phaseName, // Name of the sale's phase
      //   },
      // });

      return true;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      } else {
        throw new Error(String(err));
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

    setIsErrorFree(true);
    setIsSubmitting(true);

    try {
      await handleUpdateClaimCondition(props.nft.id, props.ccIndex, {
        ...data,
        maxClaimablePerWallet: data.maxClaimablePerWallet,
        startTimestamp: new Date(data.startTimestamp).getTime().toString(),
      });
    } catch (err) {
      setIsSubmitting(false);

      toast.error('Set Claim Conditions', {
        description:
          (err as Error).message || `Setting claim conditions failed!`,
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
          disabled={isErrorFree && isSubmitting}
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
          disabled={isErrorFree && isSubmitting}
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
                ${isErrorFree && isSubmitting && `hover: cursor-progress`}
              `}
          type="submit"
          disabled={isErrorFree && isSubmitting}
        >
          {isErrorFree && isSubmitting ? 'Updating...' : ' Update'}
        </button>
      </div>
    </form>
  );
}
