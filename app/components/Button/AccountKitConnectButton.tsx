'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@app/components/ui/button';
import { useToast } from '@app/hooks/use-toast';
import { useAuthModal, useLogout, useUser } from '@account-kit/react';

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
  const { openAuthModal } = useAuthModal();
  const { logout } = useLogout();
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      await openAuthModal();
      router.refresh();
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
      await logout();
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
      onClick={user ? handleDisconnect : handleConnect}
      disabled={isLoading}
      className={className}
      style={style}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⚡</span>
          {user ? 'Disconnecting...' : 'Connecting...'}
        </span>
      ) : user ? (
        'Disconnect'
      ) : (
        label
      )}
    </Button>
  );
}
