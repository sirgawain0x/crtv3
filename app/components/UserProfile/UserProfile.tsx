'use client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/components/ui/tabs';
import { formatAddress, stack } from '@app/lib/sdk/stack/client';
import { client } from '@app/lib/sdk/thirdweb/client';
import { CREATIVE_ADDRESS } from '@app/lib/utils/context';
import Unlock from '@app/lib/utils/Unlock.json';
import { NextPage } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getContract } from 'thirdweb/contract';
import { base } from 'thirdweb/chains';
import { getNFT, getOwnedTokenIds } from 'thirdweb/extensions/erc721';
import { TransactionButton, useActiveAccount } from 'thirdweb/react';
import { Account } from 'thirdweb/wallets';
import { prepareContractCall, readContract } from 'thirdweb/transaction';
import LazyMintedAsset from '../lazy-minted/LazyMinted';
import ListUploadedAssets from '../list-uploaded-assets/ListUploadedAssets';
import CreateMetoken from '../MeToken/createMetoken';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import MemberCard from './MemberCard';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { ProtectedRoute } from '@app/components/Auth/ProtectedRoute';
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { FaExclamationTriangle } from 'react-icons/fa';

const ProfilePage: NextPage = () => {
  const { user } = useParams();
  const [transferAddress, setTransferAddress] = useState('');
  const [lendingAddress, setLendingAddress] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [ownedIds, setOwnedIds] = useState<bigint[]>([]);
  const activeAccount = useActiveAccount();
  const [memberData, setMemberData] = useState<any>(null);
  const [nftData, setNftData] = useState<any>(null);
  const [balance, setBalance] = useState<string>('');
  const [points, setPoints] = useState<number>(0);

  const unlockAbi = Unlock.abi as any;

  const contract = getContract({
    client,
    chain: base,
    address: '0xf7c4cd399395d80f9d61fde833849106775269c6' as const,
    abi: unlockAbi,
  });

  // Update contract options for NFT functions
  const contractConfig = {
    abi: unlockAbi,
    address: '0xf7c4cd399395d80f9d61fde833849106775269c6' as const,
    chain: base,
    client,
  };

  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchHasValidKey() {
      if (!activeAccount?.address) return;
      setIsLoading(true);
      try {
        const hasKey = await readContract({
          contract,
          method: 'function getHasValidKey(address) view returns (bool)',
          params: [activeAccount.address],
        });
        setResult(hasKey);
      } catch (error) {
        console.error('Error reading contract:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHasValidKey();
  }, [activeAccount?.address, contract]);

  // Separate effect for fetching points
  useEffect(() => {
    const fetchPoints = async () => {
      if (activeAccount?.address) {
        try {
          const formattedAddress = formatAddress(activeAccount);
          const userPoints = await stack.getPoints(formattedAddress);
          setBalance(userPoints.toString());
        } catch (error) {
          console.error('Error fetching points:', error);
          setBalance('0');
        }
      }
    };

    fetchPoints();
  }, [activeAccount]);

  useEffect(() => {
    const fetchData = async () => {
      if (activeAccount) {
        try {
          // Fetch owned token IDs
          const ownedTokenIds = await getOwnedTokenIds({
            contract: {
              client,
              abi: unlockAbi,
              address: '0xf7c4cd399395d80f9d61fde833849106775269c6',
              chain: base,
            },
            owner: activeAccount.address,
          });
          setOwnedIds(ownedTokenIds);

          // Fetch NFT metadata if there are owned tokens
          if (ownedTokenIds.length > 0) {
            const metadata = await getNFT({
              contract: {
                client,
                abi: unlockAbi,
                address: '0xf7c4cd399395d80f9d61fde833849106775269c6',
                chain: base,
              },
              tokenId: ownedTokenIds[0],
            });
            setNftData(metadata);
          }

          setMemberData(activeAccount);
          setBalance('0');
        } catch (error) {
          console.error('Error fetching NFT data:', error);
        }
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount]);

  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        const metadata = await getNFT({
          contract: {
            client,
            abi: unlockAbi,
            address: '0xf7c4cd399395d80f9d61fde833849106775269c6',
            chain: base,
          },
          tokenId: ownedIds[0],
        });

        setNftData(metadata);
      } catch (err) {
        toast.error('NFT Data Error', {
          description:
            err instanceof Error ? err.message : 'Failed to fetch NFT data',
          duration: 3000,
        });
      }
    };

    if (ownedIds.length > 0) {
      fetchNFTData();
    }
  }, [ownedIds]);

  useEffect(() => {
    if (activeAccount) {
      setMemberData(activeAccount);
      setBalance('0');
    }
  }, [activeAccount]);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <Tabs defaultValue="Membership" className="w-full">
          <TabsList className="flex w-full space-x-1 overflow-x-auto border-b p-0 md:justify-start">
            <TabsTrigger
              id="members"
              value="Membership"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Membership
            </TabsTrigger>
            <TabsTrigger
              id="metoken"
              value="MeToken"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              MeToken
            </TabsTrigger>
            <TabsTrigger
              id="uploads"
              value="Uploads"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Uploads
            </TabsTrigger>
            <TabsTrigger
              id="minted"
              value="Minted"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Minted
            </TabsTrigger>
            <TabsTrigger
              id="revenue"
              value="Revenue"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Revenue
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="Membership">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Membership</CardTitle>
                  <CardDescription>
                    Manage your membership status and details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MemberCard
                    member={memberData}
                    nft={nftData}
                    balance={balance}
                    points={points}
                  />
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <TransactionButton
                    className="flex items-center gap-2"
                    transaction={() =>
                      prepareContractCall({
                        contract,
                        method:
                          'function renewMembershipFor(uint256[] tokenIds, address referrer)',
                        params: [ownedIds, CREATIVE_ADDRESS],
                      })
                    }
                    onClick={() =>
                      toast.success('Successful Membership Renewal!')
                    }
                    onError={(error: Error) =>
                      toast.error('Error Renewing Membership.')
                    }
                  >
                    Renew
                  </TransactionButton>
                  <TransactionButton
                    className="flex items-center gap-2"
                    transaction={() =>
                      prepareContractCall({
                        contract,
                        method: 'function cancelAndRefund(uint256[] tokenIds)',
                        params: [ownedIds],
                      })
                    }
                    onClick={() =>
                      toast.success('Cancelled Membership Successfully!')
                    }
                    onError={(error: Error) =>
                      toast.error('Error Cancelling Your Membership.')
                    }
                  >
                    Cancel
                  </TransactionButton>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="Uploads">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Upload Content</CardTitle>
                  <CardDescription>
                    Share your videos with the community
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link
                    href={`/profile/${activeAccount?.address}/upload`}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Upload New Video
                  </Link>
                  <div className="mt-6">
                    <ListUploadedAssets
                      activeAccount={activeAccount as Account}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Minted">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Minted NFTs</CardTitle>
                  <CardDescription>View your ed NFT collection</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeAccount && (
                    <LazyMintedAsset activeAccount={activeAccount as Account} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="MeToken">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Creator Token</CardTitle>
                  <CardDescription>
                    Create and manage your personal token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateMetoken />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Revenue">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Revenue Dashboard</CardTitle>
                  <CardDescription>
                    Track your earnings and analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <p className="text-muted-foreground">Coming Soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
};

export default ProfilePage;
