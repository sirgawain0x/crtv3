'use client';

import { Button } from '@app/components/ui/button';
import { useOrbisAuth } from '@app/hooks/useOrbisAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function OrbisAuthButton() {
  const { isAuthenticated, isLoading, connect, disconnect, error } =
    useOrbisAuth();

  async function handleAuth() {
    try {
      if (isAuthenticated) {
        await disconnect();
        toast('Disconnected from Orbis', {
          description: 'You have been successfully logged out.',
          duration: 3000,
        });
      } else {
        await connect();
        toast('Connected to Orbis', {
          description: 'You have been successfully authenticated.',
          duration: 3000,
        });
      }
    } catch (err) {
      toast('Authentication Error', {
        description:
          err instanceof Error ? err.message : 'Failed to authenticate',
        duration: 3000,
      });
    }
  }

  return (
    <Button
      onClick={handleAuth}
      disabled={isLoading}
      variant={isAuthenticated ? 'destructive' : 'default'}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : isAuthenticated ? (
        'Disconnect Orbis'
      ) : (
        'Connect Orbis'
      )}
    </Button>
  );
}
