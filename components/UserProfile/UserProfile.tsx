"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { CreativeBankTab } from "./CreativeBankTab";
import { MembershipHome } from "@/components/memberships/MembershipHome";
import { logger } from '@/lib/utils/logger';
import { CancelMembershipButton } from "./CancelMembershipButton";


function useServerMembership(address?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res.memberships);
          setError(null);
        }
      })
      .catch((e) => {
        // Only set error if it's not an abort or connection refused error
        // Connection refused typically means server isn't ready yet
        if (e.name === "AbortError") {
          // Request was aborted, ignore
          return;
        }
        // Connection errors are common during development hot reload
        // Don't set error state for network/connection errors to avoid noise
        const isConnectionError =
          e.message.includes("ERR_CONNECTION_REFUSED") ||
          e.message.includes("Failed to fetch") ||
          e.message.includes("NetworkError") ||
          e.message.includes("Network request failed");

        if (isConnectionError) {
          // Log but don't set error state - server may be restarting
          logger.debug("Membership API not available:", e.message);
          return;
        }
        setError(e.message);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
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
            <TabsTrigger
              value="Bank"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Bank
            </TabsTrigger>
            <TabsTrigger
              value="Membership"
              className="flex-shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium"
            >
              Membership
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

            <TabsContent value="Bank">
              <CreativeBankTab />
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

            {/* Membership Tab Content */}
            <TabsContent value="Membership">
              {validMembership ? (
                <Card>
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Membership</CardTitle>
                    <CardDescription>
                      Manage your membership details and benefits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between p-6 border rounded-xl bg-card">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">
                            {validMembership.lock?.name || validMembership.name}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-500">
                            Active
                          </span>
                        </div>
                        {validMembership.expiration && validMembership.expiration < 32503680000 ? (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Expires on {new Date(validMembership.expiration * 1000).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const now = Date.now();
                                const exp = validMembership.expiration! * 1000;
                                const diff = exp - now;
                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                if (days < 0) return "Expired";
                                if (days === 0) return "Expires today";
                                return `${days} day${days === 1 ? '' : 's'} remaining`;
                              })()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Lifetime Membership
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {/* Show renewal options if needed */}
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Toggle renewal view locally if we want, or just scroll/show the options
                            // For now, simpler to just show the tiers below this card if they click renew?
                            // Or simpler: Just render MembershipHome below this card with a "Renew / Upgrade" header
                            const element = document.getElementById("membership-renewal-options");
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          Extend Membership
                        </Button>
                        {validMembership.tokenId && (
                          <CancelMembershipButton
                            lockAddress={validMembership.address}
                            tokenId={validMembership.tokenId}
                          />
                        )}
                      </div>
                    </div>

                    <div id="membership-renewal-options" className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium">Renewal Options</h3>
                      <MembershipHome
                        setActiveTab={(tab) => {
                          if (tab === "fund") {
                            const bankTrigger = document.querySelector('[value="Bank"]') as HTMLElement;
                            if (bankTrigger) bankTrigger.click();
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <MembershipHome setActiveTab={(tab) => {
                  if (tab === "fund") {
                    // Switch to Bank tab if funding is needed
                    const bankTrigger = document.querySelector('[value="Bank"]') as HTMLElement;
                    if (bankTrigger) bankTrigger.click();
                  }
                }} />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ProfilePageGuard>
  );
};

export default ProfilePage;

export { ProfilePageGuard };
