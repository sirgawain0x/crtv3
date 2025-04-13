'use client';

import { useUser } from '@account-kit/react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@app/lib/services/auth';
import { toast } from 'sonner';

interface OrbisError {
  message: string;
  status?: number;
}

export function LoginButton() {
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!user) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);

      // First check if already connected to Orbis
      const isConnected = await AuthService.isOrbisConnected();
      if (isConnected) {
        // If already connected, try to disconnect first to ensure clean state
        await AuthService.disconnectFromOrbis();
      }

      // Connect with Orbis first with error handling
      const orbisResult = await AuthService.connectWithOrbis().catch(
        (error: OrbisError) => {
          console.error('Orbis connection error:', error);
          throw new Error(error.message || 'Failed to connect to Orbis');
        },
      );

      if (!orbisResult) {
        throw new Error('Failed to connect with Orbis');
      }

      // Then perform login with error handling
      const loginResult = await AuthService.login().catch((error: Error) => {
        console.error('Login error:', error);
        throw error;
      });

      if (!loginResult.success) {
        throw new Error(loginResult.message || 'Login failed');
      }

      toast.success('Successfully logged in');
      router.refresh();
    } catch (error) {
      console.error('Login process failed:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Show user-friendly error message
      toast.error(error instanceof Error ? error.message : 'Failed to login');

      // Try to clean up on error
      try {
        await AuthService.disconnectFromOrbis();
      } catch (cleanupError) {
        console.error('Failed to cleanup after login error:', cleanupError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      disabled={!user || isLoading}
      onClick={handleClick}
      className="min-w-[100px]"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging in...
        </>
      ) : (
        'Login'
      )}
    </Button>
  );
}
