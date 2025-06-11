'use client';

import { useAccount } from 'wagmi';
import { Button } from '../ui/button';
import { ErrorBoundary } from '../ui/error-boundary';
import { authenticate } from '../../actions/auth';
import { toast } from 'sonner';
import { useState } from 'react';

export function ConnectWallet() {
  const { address, chainId } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!address || !chainId) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      const result = await authenticate({ address, chainId });

      if (!result) {
        toast.error('Failed to authenticate');
        return;
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Successfully connected wallet');
    } catch (error) {
      toast.error('Failed to authenticate');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col items-center gap-4 p-4">
        <Button
          onClick={handleConnect}
          disabled={isLoading || !address}
          className="w-full max-w-sm"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </div>
    </ErrorBoundary>
  );
}
