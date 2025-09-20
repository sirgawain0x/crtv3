"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeTokensSupabase, MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { MeTokenCreator } from './MeTokenCreator';
import { MeTokenTrading } from './MeTokenTrading';
import { MeTokenInfo } from './MeTokenInfo';
import { Loader2, AlertCircle, Plus, TrendingUp, Info, RefreshCw, Search } from 'lucide-react';

interface MeTokensSectionProps {
  walletAddress?: string;
}

export function MeTokensSection({ walletAddress }: MeTokensSectionProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [userMeToken, setUserMeToken] = useState<MeTokenData | null>(null);
  const [manualMeTokenAddress, setManualMeTokenAddress] = useState('');
  const [isCheckingManual, setIsCheckingManual] = useState(false);

  const { 
    userMeToken: hookMeToken, 
    loading, 
    error, 
    isConfirmed,
    checkSpecificMeToken
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
    // Try to check for the specific MeToken address if we know it
    // For now, just refresh the general check
    window.location.reload();
  };

  const handleCheckManualMeToken = async () => {
    if (!manualMeTokenAddress.trim()) return;
    
    setIsCheckingManual(true);
    try {
      const result = await checkSpecificMeToken(manualMeTokenAddress.trim());
      if (result) {
        setActiveTab('overview');
        setManualMeTokenAddress('');
      }
    } catch (err) {
      console.error('Failed to check manual MeToken:', err);
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
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              MeTokens are personal tokens that allow your community to invest in your future success. 
              They can be traded, appreciate in value, and provide utility through token-gated features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {userMeToken ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Overview
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
                    If you&apos;ve already created a MeToken but it&apos;s not showing up, enter the contract address below to check for it.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="manual-address">MeToken Contract Address</Label>
                      <Input
                        id="manual-address"
                        placeholder="0x..."
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
