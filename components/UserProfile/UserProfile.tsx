"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useContext } from "react";
import { useUser } from "@account-kit/react";
import { userToAccount } from "@/lib/types/account";
import { ListUploadedAssets } from "@/components/UserProfile/list-uploaded-assets/ListUploadedAssets";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import MemberCard from "./MemberCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FaExclamationTriangle } from "react-icons/fa";
import {
  MembershipContext,
} from "@/components/auth/MembershipGuard";
import type { MembershipDetails } from "@/lib/hooks/unlock/useMembershipVerification";
import { MeTokensSection } from "./MeTokensSection";
import { UserDisplay } from "@/components/User/UserDisplay";

function useServerMembership(address?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch("/api/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res.memberships);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [address]);

  return { data, loading, error };
}

function ProfilePageGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const activeAccount = useUser();
  const account = userToAccount(activeAccount);

  useEffect(() => {
    if (!account?.address && typeof window !== "undefined") router.replace("/");
  }, [account?.address, router]);

  if (!account?.address) return null;
  return <>{children}</>;
}

interface ProfilePageProps {
  targetAddress?: string;
}

const ProfilePage: NextPage<ProfilePageProps> = ({ targetAddress }) => {
  const membership = useContext(MembershipContext);
  const {
    isLoading: membershipLoading,
    error: membershipError,
    membershipDetails,
    walletAddress,
    walletType,
  } = membership || {};

  // Use targetAddress if provided, otherwise use the membership walletAddress
  const displayAddress = targetAddress || walletAddress;

  const {
    data: memberships,
    loading,
    error: serverMembershipError,
  } = useServerMembership(displayAddress);

  // Find the first valid membership
  const validMembership = (
    membershipDetails as MembershipDetails[] | undefined
  )?.find((m: MembershipDetails) => m.isValid);

  if (loading) return <div>Loading...</div>;
  if (serverMembershipError)
    return <div className="text-destructive">{serverMembershipError}</div>;

  return (
    <ProfilePageGuard>
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        {displayAddress && (
          <div className="mb-6">
            <UserDisplay
              address={displayAddress}
              avatarSize="lg"
              showAddress={true}
              clickable={false}
              variant="inline"
            />
          </div>
        )}
        <Tabs defaultValue="Uploads" className="w-full">
            <TabsList className="flex h-10 items-center justify-start space-x-1 rounded-lg bg-muted p-1">
              <TabsTrigger
                value="Uploads"
                className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
              >
                Uploads
              </TabsTrigger>
              <TabsTrigger
                value="MeTokens"
                className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
              >
                MeTokens
              </TabsTrigger>
              {/* <TabsTrigger
                value="Revenue"
                className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
              >
                Revenue
              </TabsTrigger> */}
            </TabsList>

            <div className="mt-6">
              <TabsContent value="Uploads">
                <Card>
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Uploads History</CardTitle>
                    <CardDescription>
                      View and manage your uploaded videos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Link
                      href="/upload"
                      className={`inline-flex items-center rounded-md bg-primary px-4 py-2 
                      text-sm font-medium text-primary-foreground hover:bg-primary/90`}
                    >
                      Upload New Video
                    </Link>
                    <div className="mt-6">
                      {displayAddress && (
                        <ListUploadedAssets
                          activeAccount={{
                            address: displayAddress,
                            type: walletType ?? "eoa",
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="MeTokens">
                <MeTokensSection walletAddress={displayAddress} />
              </TabsContent>

              {/* Revenue content will be implemented later */}
              {/* <TabsContent value="Revenue">
                <Card>
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Revenue</CardTitle>
                    <CardDescription>
                      Track your earnings and revenue streams
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <FaExclamationTriangle className="h-4 w-4" />
                      <AlertTitle>Coming Soon</AlertTitle>
                      <AlertDescription>
                        Revenue tracking features are under development
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent> */}
            </div>
          </Tabs>
        </div>
    </ProfilePageGuard>
  );
};

export default ProfilePage;

export { ProfilePageGuard };
