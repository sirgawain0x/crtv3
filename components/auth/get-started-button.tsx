'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { useAccount } from 'wagmi';
import { useSmartAccountClient } from '@account-kit/react';
import { Loader2 } from 'lucide-react';

export function GetStartedButton() {
  const { signIn, isLoading, isAuthenticated } = useAuth();
  const { address } = useAccount();
  const { toast } = useToast();
  const smartAccountClient = useSmartAccountClient();

  const handleClick = async () => {
    try {
      if (!address) {
        toast({
          title: 'Connect Wallet',
          description: 'Please connect your wallet first.',
          variant: 'destructive',
        });
        return;
      }

      await signIn();
    } catch (error) {
      console.error('Get started error:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || isAuthenticated}
      className="w-full sm:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : isAuthenticated ? (
        'Connected'
      ) : (
        'Get Started'
      )}
    </Button>
  );
}
