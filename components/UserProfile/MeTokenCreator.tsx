"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMeTokensSupabase } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { useUser } from '@account-kit/react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface MeTokenCreatorProps {
  onMeTokenCreated?: (meTokenAddress: string) => void;
}

export function MeTokenCreator({ onMeTokenCreated }: MeTokenCreatorProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [daiAmount, setDaiAmount] = useState('0');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const user = useUser();
  const { toast } = useToast();
  const { createMeToken, isPending, isConfirming, isConfirmed, transactionError, checkUserMeToken, userMeToken } = useMeTokensSupabase();
  
  // Debug: Log user state
  useEffect(() => {
    console.log('👤 User state:', { user, address: user?.address });
  }, [user]);

  // Toast notifications for transaction states
  useEffect(() => {
    if (isPending) {
      toast({
        title: "Transaction Initiated",
        description: "Please confirm the transaction in your wallet...",
      });
    }
  }, [isPending, toast]);

  useEffect(() => {
    if (isConfirming) {
      toast({
        title: "Transaction Submitted",
        description: "Waiting for transaction confirmation...",
      });
    }
  }, [isConfirming, toast]);

  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: "MeToken Created! 🎉",
        description: "Your personal token has been deployed successfully! Refreshing in 3 seconds...",
        duration: 3000,
      });
      setName('');
      setSymbol('');
      setLocalError(null);
    }
  }, [isConfirmed, toast]);

  useEffect(() => {
    if (transactionError) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: transactionError.message || "An error occurred during the transaction",
      });
    }
  }, [transactionError, toast]);

  const handleCreateMeToken = async () => {
    console.log('🚀 handleCreateMeToken called', { name, symbol, daiAmount });
    
    if (!name.trim() || !symbol.trim()) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (symbol.length > 10) {
      setLocalError('Symbol must be 10 characters or less');
      return;
    }

    const daiValue = parseFloat(daiAmount || '0');
    if (daiValue < 0) {
      setLocalError('DAI amount cannot be negative');
      return;
    }

    setLocalError(null);

    try {
      // First check if user already has a MeToken
      console.log('🔍 Checking for existing MeToken before creation...');
      try {
        await checkUserMeToken();
        if (userMeToken) {
          setLocalError('You already have a MeToken. Please use the existing one or contact support if you need to create a new one.');
          return;
        }
        
        // Also check subgraph for any MeTokens that might not be in database yet
        console.log('🔍 Checking subgraph for existing MeTokens...');
        const { meTokensSubgraph } = await import('@/lib/sdk/metokens/subgraph');
        const allMeTokens = await meTokensSubgraph.getAllMeTokens(20, 0);
        console.log(`📋 Found ${allMeTokens.length} recent MeTokens in subgraph`);
        
        // Check if any of these MeTokens belong to our user
        for (const meToken of allMeTokens.slice(0, 5)) {
          try {
            const { getMeTokenInfoFromBlockchain } = await import('@/lib/utils/metokenUtils');
            const meTokenInfo = await getMeTokenInfoFromBlockchain(meToken.id);
            if (meTokenInfo && meTokenInfo.owner.toLowerCase() === user?.address?.toLowerCase()) {
              setLocalError('You already have a MeToken. Please use the "Sync Existing MeToken" button to load it.');
              return;
            }
          } catch (err) {
            console.warn('Failed to check MeToken ownership:', meToken.id, err);
          }
        }
      } catch (checkErr) {
        console.log('ℹ️ No existing MeToken found, proceeding with creation...');
      }

      console.log('📝 Calling createMeToken with:', name.trim(), symbol.trim().toUpperCase(), daiAmount);
      await createMeToken(name.trim(), symbol.trim().toUpperCase(), 1, daiAmount);
      console.log('✅ createMeToken completed successfully');
      // Don't set success here - let the hook handle the state
    } catch (err) {
      console.error('❌ Error in createMeToken:', err);
      
      // Handle specific error cases with user-friendly messages
      let errorMessage = 'Failed to create MeToken';
      if (err instanceof Error) {
        if (err.message.includes('already have a MeToken') || err.message.includes('already owns')) {
          errorMessage = 'You already have a MeToken! Please use the "Sync Existing MeToken" button to load it, or contact support if you need to create a new one.';
        } else if (err.message.includes('User denied') || err.message.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to complete the transaction.';
        } else if (err.message.includes('gas')) {
          errorMessage = 'Transaction failed due to gas issues. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setLocalError(errorMessage);
    }
  };

  const isLoading = isPending || isConfirming;
  const hasError = localError || transactionError;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Create Your MeToken</span>
          {isConfirmed && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Create your personal token to build a community around your success. 
          Your MeToken will be tradeable and can appreciate in value based on demand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your smart account wallet to create a MeToken.
            </AlertDescription>
          </Alert>
        )}
        
        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {localError || (transactionError?.message ? `Transaction failed: ${transactionError.message}` : 'An error occurred')}
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Creating MeToken... Please confirm the transaction in your wallet.
            </AlertDescription>
          </Alert>
        )}

        {isConfirming && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Transaction submitted! Waiting for confirmation...
            </AlertDescription>
          </Alert>
        )}

        {isConfirmed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              MeToken created successfully! Your personal token is now live.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">MeToken Name</Label>
            <Input
              id="name"
              placeholder="e.g., John's MeToken"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              This will be the full name of your MeToken
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., JOHN"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={10}
            />
            <p className="text-sm text-muted-foreground">
              Short symbol for your MeToken (max 10 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daiAmount">Initial DAI Deposit (Optional)</Label>
            <Input
              id="daiAmount"
              type="number"
              placeholder="0"
              value={daiAmount}
              onChange={(e) => setDaiAmount(e.target.value)}
              disabled={isLoading}
              min="0"
              step="0.01"
            />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Amount of DAI to deposit when creating your MeToken
              </p>
              <Alert className="py-2">
                <Info className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  <strong>Need DAI?</strong> Use the account menu to:
                  <br/>1. Click <strong>&quot;Buy&quot;</strong> to purchase USDC with Wert
                  <br/>2. Click <strong>&quot;Swap&quot;</strong> to convert USDC → DAI
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleCreateMeToken}
            disabled={!user || isLoading || !name.trim() || !symbol.trim() || isConfirmed}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPending ? 'Creating...' : isConfirming ? 'Confirming...' : 'Creating MeToken...'}
              </>
            ) : isConfirmed ? (
              'MeToken Created!'
            ) : (
              'Create MeToken'
            )}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>What happens when you create a MeToken:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Your personal token will be deployed and subscribed to Hub 1 (DAI)</li>
            <li>It will be tradeable through the MeTokens bonding curve AMM</li>
            <li>Community members can buy and hold your token</li>
            <li>You can earn from trading fees and token appreciation</li>
            <li>Your token can be used for token-gated features</li>
          </ul>
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pro Tip:</strong> You can start with 0 DAI and add liquidity later. 
              Initial DAI deposits help bootstrap your token&apos;s value.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
