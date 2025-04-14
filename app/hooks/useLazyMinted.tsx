import { useUser } from '@account-kit/react';
import { useEffect, useState } from 'react';
import { getLazyMintedNFTs } from '@app/lib/services/nft';

export function useLazyMinted() {
  const user = useUser();
  const [nfts, setNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchNFTs() {
      if (!user?.address) return;

      setIsLoading(true);
      try {
        const fetchedNfts = await getLazyMintedNFTs(user.address);
        setNfts(fetchedNfts);
      } catch (error) {
        console.error('Error fetching lazy minted NFTs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNFTs();
  }, [user?.address]);

  return { nfts, isLoading };
}
