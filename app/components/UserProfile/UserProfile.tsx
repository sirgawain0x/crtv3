'use client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/components/ui/tabs';
import { formatAddress, stack } from '@app/lib/sdk/stack/client';
import { client } from '@app/lib/sdk/thirdweb/client';
import Unlock from '@app/lib/utils/Unlock.json';
import { NextPage } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getContract, prepareContractCall } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { getNFT, getOwnedTokenIds } from 'thirdweb/extensions/erc721';
import {
  TransactionButton,
  useActiveAccount,
  useReadContract,
} from 'thirdweb/react';
import { Account } from 'thirdweb/wallets';
import LazyMintedAsset from '../lazy-minted/LazyMinted';
import ListUploadedAssets from '../list-uploaded-assets/ListUploadedAssets';
import MetokenStepper from '../MeToken/MetokenStepper';
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
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { FaExclamationTriangle } from 'react-icons/fa';

const ProfilePage: NextPage = () => {
  const { isConnected } = useOrbisContext();
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

  /*******  CONTRACT READING ********/
  const unlockContract = getContract({
    client: client,
    chain: base,
    address: '0xf7c4cd399395d80f9d61fde833849106775269c6',
    abi: unlockAbi,
  });

  const { data: result, isLoading } = useReadContract({
    contract: unlockContract,
    method: 'getHasValidKey',
    params: [activeAccount?.address],
  });

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
            contract: unlockContract,
            owner: activeAccount.address,
          });
          setOwnedIds(ownedTokenIds);

          // Fetch NFT metadata if there are owned tokens
          if (ownedTokenIds.length > 0) {
            const metadata = await getNFT({
              contract: unlockContract,
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
          contract: unlockContract,
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
  }, [unlockContract, ownedIds]);

  useEffect(() => {
    if (activeAccount) {
      setMemberData(activeAccount);
      setBalance('0');
    }
  }, [activeAccount]);

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6">
        <Alert variant="destructive">
          <FaExclamationTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please connect your wallet to access your profile.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <Tabs defaultValue="Membership" className="w-full">
        {/* Mobile Tab Select */}
        <div className="block md:hidden">
          <select
            onChange={(e) => {
              const trigger = document.getElementById(
                e.target.value,
              ) as HTMLButtonElement;
              trigger?.click();
            }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="members">Membership</option>
            <option value="metoken">MeToken</option>
            <option value="uploads">Uploads</option>
            <option value="minted">Minted</option>
            <option value="revenue">Revenue</option>
          </select>
        </div>

        {/* Desktop Tabs */}
        <TabsList className="hidden w-full space-x-2 rounded-lg bg-muted p-1 md:flex">
          <TabsTrigger
            id="members"
            value="Membership"
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Membership
          </TabsTrigger>
          <TabsTrigger
            id="metoken"
            value="MeToken"
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            MeToken
          </TabsTrigger>
          <TabsTrigger
            id="uploads"
            value="Uploads"
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Uploads
          </TabsTrigger>
          <TabsTrigger
            id="minted"
            value="Minted"
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Minted
          </TabsTrigger>
          <TabsTrigger
            id="revenue"
            value="Revenue"
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Revenue
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="Membership" className="space-y-4">
            <div className="grid gap-6">
              <MemberCard
                member={memberData}
                nft={nftData}
                balance={balance}
                points={points}
              />
              {!result && (
                <Card>
                  <CardHeader>
                    <CardTitle>Get Membership</CardTitle>
                    <CardDescription>
                      Get access to exclusive content and features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href="/membership"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Get Membership
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="MeToken">
            <MetokenStepper />
          </TabsContent>

          <TabsContent value="Uploads">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Link
                  href={`/profile/${activeAccount?.address}/upload`}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Upload New Video
                </Link>
              </div>
              <ListUploadedAssets />
            </div>
          </TabsContent>

          <TabsContent value="Minted">
            {activeAccount ? (
              <LazyMintedAsset activeAccount={activeAccount} />
            ) : (
              <div>Please connect your wallet to view minted assets.</div>
            )}
          </TabsContent>

          <TabsContent value="Revenue">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Stats</CardTitle>
                <CardDescription>
                  View your revenue statistics and earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Coming Soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
