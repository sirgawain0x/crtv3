"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeTokensSupabase, MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { useUser } from '@account-kit/react';
import { MeTokenCreator } from './MeTokenCreator';
import { MeTokenTrading } from './MeTokenTrading';
import { MeTokenInfo } from './MeTokenInfo';
import { CreatorProfileManager } from './CreatorProfileManager';
import { Loader2, AlertCircle, Plus, TrendingUp, Info, RefreshCw, Search, Wallet, User } from 'lucide-react';

interface MeTokensSectionProps {
  walletAddress?: string;
}

export function MeTokensSection({ walletAddress }: MeTokensSectionProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [userMeToken, setUserMeToken] = useState<MeTokenData | null>(null);
  const [manualMeTokenAddress, setManualMeTokenAddress] = useState('');
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const user = useUser();

  const { 
    userMeToken: hookMeToken, 
    loading, 
    error, 
    isConfirmed,
    checkSpecificMeToken,
    checkUserMeToken
  } = useMeTokensSupabase(walletAddress);

  // Update local state when hook data changes
  useEffect(() => {
    if (hookMeToken) {
      setUserMeToken(hookMeToken);
    }
  }, [hookMeToken]);

  // Reset to overview tab when MeToken is created
  useEffect(() => {
    if (isConfirmed && !userMeToken) {
      setActiveTab('overview');
    }
  }, [isConfirmed, userMeToken]);

  const handleMeTokenCreated = (meTokenAddress: string) => {
    // Refresh the MeToken data
    console.log('MeToken created:', meTokenAddress);
    setActiveTab('overview');
  };

  const handleRefresh = async () => {
    // Refresh MeToken data without reloading the page
    if (checkUserMeToken) {
      await checkUserMeToken();
    }
  };

  const handleSyncExistingMeToken = async () => {
    try {
      console.log('🔄 Attempting to sync existing MeToken from subgraph...');
      
      // Import the subgraph client
      const { meTokensSubgraph } = await import('@/lib/sdk/metokens/subgraph');
      
      // Get recent MeTokens from subgraph
      const allMeTokens = await meTokensSubgraph.getAllMeTokens(50, 0);
      console.log(`📋 Found ${allMeTokens.length} recent MeTokens in subgraph`);
      
      if (allMeTokens.length > 0) {
        // Try to sync the most recent ones to database
        for (const meToken of allMeTokens.slice(0, 10)) {
          try {
            console.log('💾 Attempting to sync MeToken:', meToken.id);
            const syncResponse = await fetch('/api/metokens/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meTokenAddress: meToken.id })
            });
            
            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              console.log('✅ Synced MeToken:', syncData);
              
              // Check if this one belongs to our user
              if (syncData.data?.owner_address?.toLowerCase() === walletAddress?.toLowerCase()) {
                console.log('🎯 Found our MeToken!');
                await handleRefresh(); // Refresh to show the synced MeToken
                return;
              }
            }
          } catch (syncErr) {
            console.warn('Failed to sync MeToken:', meToken.id, syncErr);
          }
        }
      }
      
      alert('No existing MeToken found in the subgraph. If you recently created a MeToken, ' +
        'please wait a few minutes for the subgraph to sync, then try again.');
    } catch (err) {
      console.error('Failed to sync existing MeToken:', err);
      alert('Failed to sync existing MeToken. Please try again or contact support.');
    }
  };

  const handleCheckManualMeToken = async () => {
    if (!manualMeTokenAddress.trim()) return;
    
    const address = manualMeTokenAddress.trim();
    
    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      alert('Invalid address format. Please enter a valid Ethereum address (0x followed by 40 hex characters).\n\n' +
        'Note: Do not paste the transaction hash - you need to find the MeToken contract address from the "Internal Txns" tab on Basescan.');
      return;
    }
    
    setIsCheckingManual(true);
    try {
      // First, try to sync the MeToken from blockchain to database
      const syncResponse = await fetch('/api/metokens/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meTokenAddress: address })
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('MeToken synced:', syncData);
        
        // Now check if it belongs to this user
        const result = await checkSpecificMeToken(manualMeTokenAddress.trim());
        if (result) {
          setActiveTab('overview');
          setManualMeTokenAddress('');
        } else {
          alert('MeToken found on blockchain, but it does not belong to this wallet address.');
        }
      } else {
        const error = await syncResponse.json();
        console.error('Sync failed:', error);
        alert(`Failed to sync MeToken: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to check manual MeToken:', err);
      alert('Failed to check MeToken. Please try again.');
    } finally {
      setIsCheckingManual(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading MeTokens...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load MeTokens: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                MeTokens
              </CardTitle>
              <CardDescription>
                Create and manage your personal token to build a community around your success
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              MeTokens are personal tokens that allow your community to invest in your future success. 
              They can be traded, appreciate in value, and provide utility through token-gated features.
            </AlertDescription>
          </Alert>
          
          {user && walletAddress && user.address && user.address !== walletAddress && (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription className="text-xs space-y-2">
                <div><strong>Understanding Your Addresses:</strong></div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="font-semibold min-w-[110px]">Profile URL:</div>
                    <div className="font-mono text-[10px] break-all">{walletAddress}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="font-semibold min-w-[110px]">Smart Account:</div>
                    <div className="font-mono text-[10px] break-all">{user.address}</div>
                  </div>
                </div>
                <div className="text-muted-foreground pt-2 border-t">
                  💡 <strong>Note:</strong> When you create a MeToken, it will be owned by your{' '}
                  <strong>Smart Account</strong> address ({user.address?.slice(0,6)}...{user.address?.slice(-4)}).
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {userMeToken ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your MeToken: {userMeToken.name}</CardTitle>
                <CardDescription>
                  ${userMeToken.symbol} - Total Value Locked: ${userMeToken.tvl.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Your Balance</p>
                    <p className="text-2xl font-bold">
                      {parseFloat(userMeToken.balance.toString()) / 1e18} {userMeToken.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Supply</p>
                    <p className="text-2xl font-bold">
                      {parseFloat(userMeToken.totalSupply.toString()) / 1e18} {userMeToken.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">TVL</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${userMeToken.tvl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Price</p>
                    <p className="text-2xl font-bold">
                      ${(userMeToken.tvl / (parseFloat(userMeToken.totalSupply.toString()) / 1e18)).toFixed(4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <CreatorProfileManager targetAddress={walletAddress} onProfileUpdated={() => {}} />
          </TabsContent>

          <TabsContent value="trading">
            <MeTokenTrading meToken={userMeToken} />
          </TabsContent>

          <TabsContent value="info">
            <MeTokenInfo meToken={userMeToken} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create MeToken
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>No MeToken Found</CardTitle>
                <CardDescription>
                  You haven&apos;t created a MeToken yet. Create one to start building your community!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    MeTokens are personal tokens that represent your future success. 
                    Community members can buy and hold your token, and it can appreciate in value based on demand.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Benefits of Creating a MeToken:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Build a community around your success</li>
                      <li>• Earn from trading fees and token appreciation</li>
                      <li>• Create token-gated features and utilities</li>
                      <li>• Access to DeFi yield strategies</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">How It Works:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Deploy your personal ERC20 token</li>
                      <li>• Integrated with automated market maker</li>
                      <li>• Built-in pump-and-dump protection</li>
                      <li>• Community can buy/sell anytime</li>
                    </ul>
                  </div>
                </div>

                {/* Manual MeToken Check Section */}
                <div className="border-t pt-4 mt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Already Created a MeToken?
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you&apos;ve already created a MeToken but it&apos;s not showing up, enter the contract address below to sync it.
                  </p>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>How to find your MeToken address:</strong><br/>
                      1. Go to your creation transaction on Basescan<br/>
                      2. Click the <strong>&quot;Internal Txns&quot;</strong> tab<br/>
                      3. Look for <strong>&quot;Contract Creation&quot;</strong><br/>
                      4. Copy the contract address (42 characters starting with 0x)
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="manual-address">MeToken Contract Address (not transaction hash)</Label>
                      <Input
                        id="manual-address"
                        placeholder="0x1234...abcd (42 characters)"
                        value={manualMeTokenAddress}
                        onChange={(e) => setManualMeTokenAddress(e.target.value)}
                        disabled={isCheckingManual}
                      />
                    </div>
                    <Button 
                      onClick={handleCheckManualMeToken}
                      disabled={!manualMeTokenAddress.trim() || isCheckingManual}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isCheckingManual ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Check MeToken
                    </Button>
                  </div>
                  
                  {/* Auto-sync section */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Auto-Sync from Subgraph
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      If you recently created a MeToken but it&apos;s not showing up, try syncing from the subgraph.
                    </p>
                    <Button 
                      onClick={handleSyncExistingMeToken}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync Existing MeToken
                    </Button>
                  </div>
                  
                  {/* Error recovery section */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      Getting &quot;Already Owns MeToken&quot; Error?
                    </h4>
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>This error means you already have a MeToken!</strong><br/>
                        The system detected that your wallet address already owns a MeToken. 
                        Try the &quot;Sync Existing MeToken&quot; button above, or if that doesn&apos;t work, 
                        you can manually enter your MeToken contract address.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>Quick Fix:</strong> Use the &quot;Sync Existing MeToken&quot; button above to automatically find and load your MeToken.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Manual Fix:</strong> If auto-sync doesn&apos;t work, find your MeToken contract address from your creation transaction and enter it above.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <MeTokenCreator onMeTokenCreated={handleMeTokenCreated} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
