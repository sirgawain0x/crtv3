'use client';

import { useState, useCallback } from 'react';
import { createModularAccountV2Client } from '@account-kit/smart-contracts';
import { LocalAccountSigner } from '@aa-sdk/core';
import { alchemy } from '@account-kit/infra';
import { generatePrivateKey } from 'viem/accounts';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AuthService } from '@/lib/services/auth';
import { useAuth } from '@app/hooks/useAuth';
import { useChain } from '@account-kit/react';
import { ACCOUNT_KIT_CONFIG } from '@app/config/account-kit';

interface AccountKitConnectButtonProps {
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export function AccountKitConnectButton({
  className = 'text-sm sm:text-base px-3 py-1 sm:px-4 sm:py-2',
  style = {
    backgroundColor: '#EC407A',
    color: 'white',
    borderRadius: '10px',
  },
  label = 'Get Started',
}: AccountKitConnectButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuth();
  const { chain, setChain, isSettingChain } = useChain();
  const [isLoading, setIsLoading] = useState(false);
  const [accountClient, setAccountClient] = useState<Awaited<
    ReturnType<typeof createModularAccountV2Client>
  > | null>(null);

  const initializeClient = useCallback(async () => {
    try {
      const client = await createModularAccountV2Client({
        mode: ACCOUNT_KIT_CONFIG.mode,
        chain,
        transport: alchemy({ apiKey: ACCOUNT_KIT_CONFIG.alchemyApiKey }),
        signer:
          LocalAccountSigner.privateKeyToAccountSigner(generatePrivateKey()),
      });
      setAccountClient(client);
      return client;
    } catch (error) {
      console.error('Failed to initialize account client:', error);
      throw error;
    }
  }, [chain]);

  const handleConnect = async () => {
    try {
      setIsLoading(true);

      // Initialize Account Kit client if not already done
      const client = accountClient || (await initializeClient());

      // Get the smart account address
      const accountAddress = client.account.address;

      // Perform login with the smart account address
      const loginResult = await AuthService.login();
      if (!loginResult.success) {
        throw new Error(loginResult.message || 'Login failed');
      }

      // Update auth state and refresh
      await checkAuth();
      router.refresh();

      toast({
        title: 'Connected Successfully',
        description: `Smart Account Address: ${accountAddress} on chain ${chain.name}`,
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection Failed',
        description:
          error instanceof Error ? error.message : 'Failed to connect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      const result = await AuthService.logout();
      if (!result.success) {
        throw new Error(result.message || 'Logout failed');
      }

      setAccountClient(null);
      await checkAuth();
      router.refresh();

      toast({
        title: 'Disconnected Successfully',
        description: 'Your wallet has been disconnected',
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: 'Disconnect Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={isAuthenticated ? handleDisconnect : handleConnect}
      disabled={isLoading || isSettingChain}
      className={className}
      style={style}
    >
      {isLoading || isSettingChain ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⚡</span>
          {isAuthenticated ? 'Disconnecting...' : 'Connecting...'}
        </span>
      ) : isAuthenticated ? (
        'Disconnect'
      ) : (
        label
      )}
    </Button>
  );
}
