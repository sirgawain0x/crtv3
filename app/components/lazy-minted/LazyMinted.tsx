import useListLazyMinted from '@app/hooks/useLazyMinted';
import { parseIpfsUri } from '@app/lib/helpers';
import { NFT } from '@app/types/nft';
import { useCallback, useState } from 'react';
import ConfigureMintedAsset from '../configure-minted-asset/ConfigureMintedAsset';
import { Account } from 'thirdweb/wallets';

type LazyMintedProps = {
  activeAccount: Account;
};

export default function LazyMintedAsset(props: LazyMintedProps) {
  const { error, isProcessing, nfts } = useListLazyMinted();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nft, setNFT] = useState<NFT>();
  const [addClaimPhase, setAddClaimPhase] = useState(false);

  const toggleModal = useCallback(() => {
    setIsModalOpen((prevState) => !prevState);
  }, []);

  const handleViewMore = (_nft: NFT) => {
    toggleModal();
    setNFT(_nft);
  };

  return (
    <>
      {isProcessing && nfts.length === 0 && (
        <p className="my-2 text-lg text-[--color-brand-red-shade]">
          Loading minted nft(s)...
        </p>
      )}

      {!isProcessing && nfts.length === 0 && (
        <p className="my-2  text-lg text-gray-400">
          {error ? (
            <span className="text-red-400"> {error.message} </span>
          ) : (
            ' No minted nft yet!'
          )}
        </p>
      )}

      {nfts && nfts.length > 0 && (
        <table className="w-full table-auto">
          <thead>
            <tr className="text-sm text-gray-600">
              <th className="border border-slate-600 px-4 py-1 ">ID</th>
              <th className="border border-slate-600 px-4 py-1">Media</th>
              <th className="border border-slate-600 px-4 py-1">Name</th>
              <th className="border border-slate-600 px-4 py-1">Description</th>
              <th className="border border-slate-600 px-4 py-1">Supply</th>
              <th className="border border-slate-600 px-4 py-1">More</th>
            </tr>
          </thead>
          <tbody>
            {nfts.map((nft, i) => (
              <tr
                key={nft.metadata.name + '-' + nft.id}
                onClick={() => handleViewMore(nft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleViewMore(nft);
                  }
                }}
                tabIndex={0}
                role="button"
                className="hover:cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <td className="border border-slate-700 px-4 py-1">
                  {nft.id.toLocaleString()}
                </td>
                <td className="border border-slate-700 px-4 py-1">
                  <video
                    src={
                      nft.metadata.animation_url
                        ? parseIpfsUri(nft.metadata.animation_url)
                        : ''
                    }
                    aria-label={`Preview of ${nft.metadata.name || 'NFT'}`}
                    playsInline
                    width={180}
                    crossOrigin="anonymous"
                    muted
                    controls
                  ></video>
                  {/* TODO: Revisit Player */}
                  {/* <Player.Root src={nft.metadata.animation_url} /> */}
                </td>
                <td className="border border-slate-700 px-4 py-1">
                  {nft.metadata.name || 'No name'}
                </td>
                <td className="border border-slate-700 px-4 py-1">
                  {nft.metadata.description || 'No description'}
                </td>
                <td className="border border-slate-700 px-4 py-1">
                  {nft.supply.toString()}
                </td>
                <td className="border border-slate-700 px-4 py-1">{'->'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {nft && isModalOpen && (
        <ConfigureMintedAsset
          nft={nft}
          toggleModal={toggleModal}
          setAddClaimPhase={setAddClaimPhase}
          addClaimPhase={addClaimPhase}
        />
      )}
    </>
  );
}
