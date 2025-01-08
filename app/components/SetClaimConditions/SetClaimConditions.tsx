import {
  claimConditionsOptions,
  priceInHumanReadable,
  timestampToInputDateString,
} from '@app/lib/helpers/helpers';
import { client } from '@app/lib/sdk/thirdweb/client';
import {
  erc20Contract,
  videoContract,
} from '@app/lib/sdk/thirdweb/get-contract';
import { EditonDropContractDeployedChain } from '@app/lib/utils/context';
import { NFT, ResolvedReturnType } from '@app/types/nft';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { sendTransaction, waitForReceipt } from 'thirdweb';
import {
  getClaimConditions,
  setClaimConditions,
} from 'thirdweb/extensions/erc1155';
import { useActiveAccount } from 'thirdweb/react';
import { decimals } from 'thirdweb/extensions/erc20';

type ClaimFormData = {
  price: bigint;
  currency: string;
  phaseName: string | undefined;
  maxClaimablePerWallet: string | number;
  maxClaimableSupply: bigint | number;
  startTimestamp: number;
};

type SetClaimConditionsProps = {
  nft: NFT;
  contractMetadata?: string;
  numberOfClaimsConditonsAvailable: number;
  setAddClaimPhase: (arg: boolean) => void;
  claimConditions: ResolvedReturnType<ReturnType<typeof getClaimConditions>>; // needed to be included with the new claimCondition
  getClaimConditionsById?: (tokenId: string) => void;
};

//
export default function SetClaimConditions(props: SetClaimConditionsProps) {
  const activeAccount = useActiveAccount();
  const [isSettingCC, setIsSettingCC] = useState(false);
  const [isErrorFree, setIsErrorFree] = useState(false);

  const {
    handleSubmit,
    formState,
    register,
    reset: resetForm,
  } = useForm<ClaimFormData>();

  const handleSetCC = async (formData: ClaimFormData, tokenId: bigint) => {
    if (!activeAccount) {
      throw new Error('No active account found!');
    }

    setIsSettingCC(true);

    const updatedPreviousCCs =
      props.claimConditions.length > 0
        ? await Promise.all(
            props.claimConditions.map(async (cc, i) => {
              const decimal = await decimals({
                contract: erc20Contract(cc.currency),
              });

              return {
                startTime: new Date(
                  timestampToInputDateString(cc.startTimestamp),
                ),
                price: priceInHumanReadable(cc.pricePerToken, decimal),
                currencyAddress: cc.currency,
                maxClaimablePerWallet: cc.quantityLimitPerWallet,
                maxClaimableSupply: BigInt(cc.maxClaimableSupply),
                metadata: {
                  name: `Phase-${new Date().getTime()}`,
                },
              };
            }),
          )
        : [];

    try {
      const transaction = setClaimConditions({
        contract: videoContract,
        tokenId,
        phases: [
          ...updatedPreviousCCs,
          {
            startTime: new Date(formData.startTimestamp),
            price: props.nft.metadata.properties.price.toString(),
            currencyAddress: formData.currency,
            maxClaimablePerWallet: BigInt(formData.maxClaimablePerWallet),
            maxClaimableSupply: BigInt(formData.maxClaimableSupply),
            metadata: {
              name: formData.phaseName,
            },
          },
        ],
        resetClaimEligibility: false,
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

      return { transactionHash, receipt };
    } catch (err) {
      setIsSettingCC(false);
      if (err instanceof Error) {
        throw new Error((err as Error).message);
      } else {
        throw err;
      }
    }
  };

  const handleSubmitCCs: SubmitHandler<ClaimFormData> = async (data) => {
    const { errors } = formState;

    const isRequiredFields =
      errors.maxClaimablePerWallet?.type === 'required' ||
      errors.currency?.type === 'required' ||
      errors.maxClaimableSupply?.type === 'required' ||
      errors.phaseName?.type === 'required' ||
      errors.startTimestamp?.type === 'required';

    if (isRequiredFields) {
      return;
    }

    const formatData: ClaimFormData = {
      ...data,
      startTimestamp: data.startTimestamp,
      price: props.nft.metadata.properties.price,
      maxClaimablePerWallet: data.maxClaimablePerWallet,
      maxClaimableSupply: props.nft.metadata.properties.amount,
    };

    setIsErrorFree(true);
    setIsSettingCC(true);

    try {
      const { receipt } = await handleSetCC(formatData, props.nft.id);

      if (receipt) {
        resetForm();

        toast.success('Set Claim Conditions', {
          description: `Successful with status: ${receipt.status}`,
          duration: 3000,
        });

        setIsSettingCC(false);
      }
    } catch (err) {
      setIsSettingCC(false);

      toast.error('Set Claim Conditions', {
        description:
          err instanceof Error
            ? err.message
            : `Setting claim conditions failed!`,
        duration: 4000,
      });
    }
  };

  return (
    <div className="my-4 rounded-md border border-solid border-slate-500 p-8">
      <h4 className="py-4 text-xl font-medium text-slate-300">
        Set conditions for the sale/claim of your NFT(s)
      </h4>
      <form
        id="setClaimCondtion"
        className="my-4 flex flex-col gap-4"
        onSubmit={handleSubmit(handleSubmitCCs)}
      >
        <div className="flex flex-col space-y-1">
          <label
            htmlFor="startTimestamp"
            className="my-2 font-medium dark:text-slate-400"
          >
            Name of Phase
          </label>
          <input
            id="phaseName"
            {...register('phaseName', { required: true })}
            defaultValue={`Phase-${new Date().getTime()}` || ''}
            placeholder="Enter name to for this phase (Phase One)"
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            disabled={isErrorFree && isSettingCC}
          />
          {formState.errors.phaseName?.type === 'required' && (
            <span className="my-4 block text-sm text-red-500">
              Select a name for the phase of sales.
            </span>
          )}
        </div>

        <div className="flex flex-col space-y-1">
          <label
            htmlFor="currency"
            className="my-2 font-medium dark:text-slate-400"
          >
            Start time of Phase
          </label>
          <input
            id="startTimestamp"
            {...register('startTimestamp', { required: true })}
            type="datetime-local"
            placeholder="Start date and time of Phase"
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            aria-invalid={formState.errors.startTimestamp ? 'true' : 'false'}
            disabled={isErrorFree}
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
            {...register('currency', { required: true })}
            aria-invalid={formState.errors.currency ? 'true' : 'false'}
          >
            <option value="">-- Select Currency --</option>
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
            {...register('maxClaimablePerWallet', { required: true, min: 1 })}
            placeholder="The maximum number of tokens a wallet can claim"
            className="w-full rounded-md border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-200"
            disabled={isErrorFree && isSettingCC}
          />
          {formState.errors.maxClaimablePerWallet?.type === 'required' && (
            <span className="my-4 block text-sm text-red-500">
              The maximum number of tokens a wallet can claim.
            </span>
          )}
          {formState.errors.maxClaimablePerWallet?.type === 'min' && (
            <span className="mt-4 block text-sm text-red-500">
              The numbet to claim must be greater than zero (0).
            </span>
          )}
        </div>

        <div className="mt-4 space-x-8 space-y-3">
          <button
            className={`min-w-10 rounded bg-[--color-brand-red] px-4 py-2 text-white transition duration-300 hover:bg-[--color-brand-red-shade]
                      ${isErrorFree && isSettingCC && `hover: cursor-progress`}
                    `}
            type="submit"
            disabled={isErrorFree && isSettingCC}
          >
            {isErrorFree && isSettingCC ? 'Processing...' : '  Set Conditions'}
          </button>
          <button
            className={`min-w-10 rounded border border-slate-300 bg-slate-800 px-4 py-2 text-white`}
            type="submit"
            onClick={(e) => {
              e.preventDefault();

              props.setAddClaimPhase(false);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
