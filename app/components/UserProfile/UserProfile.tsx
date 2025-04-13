'use client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/components/ui/tabs';
import { formatAddress, stack } from '@app/lib/sdk/stack/client';
import { CREATIVE_ADDRESS } from '@app/lib/utils/context';
import Unlock from '@app/lib/utils/Unlock.json';
import { NextPage } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { base } from 'viem/chains';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { useUser } from '@account-kit/react';
import { userToAccount } from '@app/lib/types/account';
import ListUploadedAssets from '../list-uploaded-assets/ListUploadedAssets';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import MemberCard from './MemberCard';
import { ProtectedRoute } from '@app/components/Auth/ProtectedRoute';
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Button } from '../ui/button';
import { useProfile } from './useProfile';

const ProfilePage: NextPage = () => {
  const { user } = useParams();
  const [transferAddress, setTransferAddress] = useState('');
  const [lendingAddress, setLendingAddress] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const activeAccount = useUser();
  const account = userToAccount(activeAccount);
  const {
    memberData,
    nftData,
    balance,
    points,
    isLoading,
    handleRenewMembership,
    handleCancelMembership,
    ownedIds,
  } = useProfile(account);

  // Setup Viem clients
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;

  const walletClient =
    typeof window !== 'undefined'
      ? (createWalletClient({
          chain: base,
          transport: custom(window.ethereum),
        }) as WalletClient)
      : null;

  const contractAddress = '0xf7c4cd399395d80f9d61fde833849106775269c6';

  const [result, setResult] = useState<any>(null);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="Membership" className="w-full">
          <TabsList className="flex h-10 items-center justify-start space-x-1 rounded-lg bg-muted p-1">
            <TabsTrigger
              value="Membership"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Membership
            </TabsTrigger>
            <TabsTrigger
              value="Uploads"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Uploads
            </TabsTrigger>
            <TabsTrigger
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
                  <Button
                    onClick={handleRenewMembership}
                    className="flex items-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Renew'}
                  </Button>
                  <Button
                    onClick={handleCancelMembership}
                    className="flex items-center gap-2"
                    variant="destructive"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Cancel'}
                  </Button>
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
                    href={`/profile/${account?.address}/upload`}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Upload New Video
                  </Link>
                  <div className="mt-6">
                    <ListUploadedAssets activeAccount={account as Account} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="Revenue">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Revenue</CardTitle>
                  <CardDescription>
                    Track your earnings and revenue streams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Revenue content will be implemented later */}
                  <Alert>
                    <FaExclamationTriangle className="h-4 w-4" />
                    <AlertTitle>Coming Soon</AlertTitle>
                    <AlertDescription>
                      Revenue tracking features are under development
                    </AlertDescription>
                  </Alert>
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
