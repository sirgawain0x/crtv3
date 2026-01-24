"use client";

/**
 * RobustMeTokenCreator - MeToken creation component with timeout handling
 * 
 * This component uses the useMeTokenCreation hook to provide:
 * 1. Progressive status updates
 * 2. Timeout recovery with background polling
 * 3. Pending transaction persistence and recovery
 * 4. Better UX for long blockchain transactions
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  Info, 
  Clock, 
  RefreshCw,
  Wallet,
  ArrowRight,
  X
} from 'lucide-react';
import { formatEther, parseEther } from 'viem';
import { useSmartAccountClient, useChain } from '@account-kit/react';
import { useToast } from '@/components/ui/use-toast';
import { useMeTokenCreation, PendingMeTokenTransaction, CreationStatus } from '@/lib/hooks/metokens/useMeTokenCreation';
import { getDaiTokenContract } from '@/lib/contracts/DAIToken';
import { logger } from '@/lib/utils/logger';


interface RobustMeTokenCreatorProps {
  onMeTokenCreated?: (meTokenAddress: string, transactionHash?: string) => void;
}

// Status step configuration
const STATUS_STEPS: Record<CreationStatus, { label: string; icon: React.ReactNode; color: string }> = {
  idle: { label: 'Ready to create', icon: <Wallet className="h-4 w-4" />, color: 'text-muted-foreground' },
  checking_balance: { label: 'Checking DAI balance...', icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-blue-500' },
  approving_dai: { label: 'Approving DAI...', icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-blue-500' },
  waiting_approval: { label: 'Waiting for approval...', icon: <Clock className="h-4 w-4 animate-pulse" />, color: 'text-yellow-500' },
  creating_metoken: { label: 'Creating MeToken...', icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-blue-500' },
  waiting_confirmation: { label: 'Waiting for confirmation...', icon: <Clock className="h-4 w-4 animate-pulse" />, color: 'text-yellow-500' },
  polling_status: { label: 'Checking for your MeToken...', icon: <RefreshCw className="h-4 w-4 animate-spin" />, color: 'text-purple-500' },
  success: { label: 'MeToken created!', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' },
  error: { label: 'Error', icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500' },
};

export function RobustMeTokenCreator({ onMeTokenCreated }: RobustMeTokenCreatorProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [hubId, setHubId] = useState('1');
  const [assetsDeposited, setAssetsDeposited] = useState('');
  const [daiBalance, setDaiBalance] = useState<bigint>(BigInt(0));
  const [showPendingTransactions, setShowPendingTransactions] = useState(false);

  const { client } = useSmartAccountClient({});
  const { chain } = useChain();
  const { toast } = useToast();
  
  const {
    state,
    createMeToken,
    pendingTransactions,
    checkPendingTransactions,
    clearPendingTransaction,
    retryPendingTransaction,
  } = useMeTokenCreation();

  // Check DAI balance
  const checkDaiBalance = useCallback(async () => {
    if (!client?.account?.address) return;
    
    try {
      const daiContract = getDaiTokenContract('base');
      const balance = await client.readContract({
        address: daiContract.address as `0x${string}`,
        abi: daiContract.abi,
        functionName: 'balanceOf',
        args: [client.account.address],
      }) as bigint;
      
      setDaiBalance(balance);
    } catch (err) {
      logger.error('Failed to check DAI balance:', err);
      setDaiBalance(BigInt(0));
    }
  }, [client]);

  // Check balance on mount and when client changes
  useEffect(() => {
    checkDaiBalance();
  }, [checkDaiBalance]);

  // Handle successful creation
  useEffect(() => {
    if (state.status === 'success' && state.meTokenAddress) {
      toast({
        title: "MeToken Created Successfully!",
        description: `Your MeToken "${name}" (${symbol}) is ready for trading.`,
      });
      
      onMeTokenCreated?.(state.meTokenAddress, state.txHash);
      
      // Reset form
      setName('');
      setSymbol('');
      setAssetsDeposited('');
      setHubId('1');
    }
  }, [state.status, state.meTokenAddress, state.txHash, name, symbol, toast, onMeTokenCreated]);

  // Handle creation
  const handleCreate = async () => {
    if (!name.trim() || !symbol.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a name and symbol for your MeToken.",
        variant: "destructive",
      });
      return;
    }

    const depositAmount = parseEther(assetsDeposited || '0');
    
    if (depositAmount > BigInt(0) && daiBalance < depositAmount) {
      toast({
        title: "Insufficient DAI",
        description: `You need ${assetsDeposited} DAI but only have ${formatEther(daiBalance)} DAI.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createMeToken({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        hubId: parseInt(hubId),
        assetsDeposited: assetsDeposited || '0',
      });
    } catch (err) {
      // Error is handled in the hook
      toast({
        title: "Creation Failed",
        description: err instanceof Error ? err.message : "Failed to create MeToken",
        variant: "destructive",
      });
    }
  };

  const isProcessing = !['idle', 'success', 'error'].includes(state.status);
  const hasEnoughDai = daiBalance >= parseEther(assetsDeposited || '0');
  const currentStep = STATUS_STEPS[state.status];

  const getExplorerUrl = (type: 'tx' | 'address', hash: string) => {
    return `https://basescan.org/${type}/${hash}`;
  };

  return (
    <div className="space-y-4">
      {/* Pending Transactions Recovery Banner */}
      {pendingTransactions.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <Clock className="h-4 w-4" />
          <AlertTitle>Pending Transactions Found</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              You have {pendingTransactions.length} pending MeToken transaction(s) that may have been interrupted.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPendingTransactions(!showPendingTransactions)}
            >
              {showPendingTransactions ? 'Hide' : 'View'} Pending Transactions
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Transactions List */}
      {showPendingTransactions && pendingTransactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTransactions.map((tx) => (
              <PendingTransactionCard
                key={tx.userOpHash}
                tx={tx}
                onRetry={() => retryPendingTransaction(tx)}
                onClear={() => clearPendingTransaction(tx.userOpHash)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Creation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Create MeToken</span>
            {state.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
          </CardTitle>
          <CardDescription>
            Create your personal token that fans can buy and sell on the bonding curve.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Indicator */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={currentStep.color}>{currentStep.icon}</span>
                <span className="text-sm font-medium">{state.message || currentStep.label}</span>
              </div>
              <Progress value={state.progress} className="h-2" />
              
              {/* Show transaction hashes when available */}
              {state.userOpHash && (
                <p className="text-xs text-muted-foreground">
                  UserOp: {state.userOpHash.slice(0, 10)}...{state.userOpHash.slice(-8)}
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {state.status === 'success' && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>{state.message}</p>
                  {state.txHash && (
                    <a
                      href={getExplorerUrl('tx', state.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Transaction <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {state.meTokenAddress && (
                    <a
                      href={getExplorerUrl('address', state.meTokenAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View MeToken Contract <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {state.status === 'error' && state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">MeToken Name</Label>
                <Input
                  id="name"
                  placeholder="My Creative Token"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="MCT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  disabled={isProcessing}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hubId">Hub ID</Label>
              <Input
                id="hubId"
                type="number"
                placeholder="1"
                value={hubId}
                onChange={(e) => setHubId(e.target.value)}
                disabled={isProcessing}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Hub ID determines the bonding curve parameters. Default is 1.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetsDeposited">Initial DAI Deposit (Optional)</Label>
              <Input
                id="assetsDeposited"
                type="number"
                placeholder="0.00"
                value={assetsDeposited}
                onChange={(e) => setAssetsDeposited(e.target.value)}
                disabled={isProcessing}
                step="0.01"
                min="0"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Your DAI balance: {formatEther(daiBalance)} DAI</span>
                {assetsDeposited && parseFloat(assetsDeposited) > 0 && (
                  <span className={hasEnoughDai ? 'text-green-600' : 'text-red-600'}>
                    {hasEnoughDai ? '✓ Sufficient' : '✗ Insufficient'}
                  </span>
                )}
              </div>
            </div>

            <Button 
              onClick={handleCreate}
              disabled={isProcessing || !name || !symbol || (parseFloat(assetsDeposited || '0') > 0 && !hasEnoughDai)}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep.label}
                </>
              ) : (
                <>
                  Create MeToken
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Info Section */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p><strong>What happens next:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your MeToken will be created on the Base blockchain</li>
                  <li>If depositing DAI, you&apos;ll approve it first</li>
                  <li>Transaction may take 30 seconds to 2 minutes</li>
                  <li>If it times out, we&apos;ll keep checking in the background</li>
                  <li>Your MeToken will be tradeable immediately after creation</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Pending Transaction Card Component
function PendingTransactionCard({
  tx,
  onRetry,
  onClear,
}: {
  tx: PendingMeTokenTransaction;
  onRetry: () => void;
  onClear: () => void;
}) {
  const getStatusBadge = () => {
    switch (tx.status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Pending</span>;
      case 'confirming':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Confirming</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Confirmed</span>;
      case 'timeout':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">Timeout</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">Failed</span>;
    }
  };

  const timeSince = () => {
    const seconds = Math.floor((Date.now() - tx.createdAt) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tx.name} ({tx.symbol})</span>
          {getStatusBadge()}
        </div>
        <div className="text-xs text-muted-foreground">
          {tx.assetsDeposited} DAI • {timeSince()}
        </div>
        {tx.meTokenAddress && (
          <a
            href={`https://basescan.org/address/${tx.meTokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {tx.meTokenAddress.slice(0, 8)}...{tx.meTokenAddress.slice(-6)}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        {(tx.status === 'timeout' || tx.status === 'failed') && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default RobustMeTokenCreator;
