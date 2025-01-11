'use client';
import useLazyMint from '@app/hooks/useLazyMint';
import { blockExplorer } from '@app/lib/utils/context';
import { useState } from 'react';
import { toast } from 'sonner';

type TLazyMintProps = {
  baseURIForToken: string;
  onSuccess: (res: string) => void;
};

export default function LazyMint(props: TLazyMintProps) {
  const { handleLazyMint, isProcessing, error } = useLazyMint();
  const [txHash, setTxHash] = useState('');

  const handleSubmitLazyMint = async () => {
    try {
      const txnHash = await handleLazyMint({
        baseURIForTokens: props.baseURIForToken,
      });

      if (txnHash) {
        setTxHash(txnHash);
        props.onSuccess(txnHash);

        toast.success('Lazy Minting', {
          description: `Transaction hsuccessful`,
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
        throw new Error(`Minting failed: ${error?.message}`);
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
    <div className="my-24 w-full rounded-lg">
      <h2
        className={`mb-6 text-xl font-bold ${txHash ? `text-slate-300` : 'text-slate-50'} ${Boolean(txHash) && `opacity-50`}`}
      >
        Lazy mint your NFT so it is available for claiming
      </h2>

      <div className="space-x-8 space-y-3" aria-disabled={Boolean(txHash)}>
        <button
          className={`min-w-10 rounded bg-slate-50 px-4 py-2 text-black transition duration-300 hover:bg-slate-200
                ${isProcessing && `hover: cursor-progress`} ${Boolean(txHash) && `opacity-50`}
                   ${Boolean(txHash) && `hover: cursor-not-allowed`}
              `}
          type="submit"
          disabled={isProcessing}
          onClick={(e) => {
            if (txHash) {
              e.preventDefault();
              return;
            }
            handleSubmitLazyMint();
          }}
        >
          {isProcessing ? 'Lazy Minting...' : ' Lazy Mint NFT'}
        </button>
      </div>
    </div>
  );
}
