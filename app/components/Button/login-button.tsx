'use client';

import { useActiveAccount } from 'thirdweb/react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@app/lib/services/auth';
import { toast } from 'sonner';

export function LoginButton() {
  const account = useActiveAccount();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);

      // Connect with Orbis first
      const orbisResult = await AuthService.connectWithOrbis();
      if (!orbisResult) {
        throw new Error('Failed to connect with Orbis');
      }

      // Then perform login
      const loginResult = await AuthService.login();
      if (!loginResult.success) {
        throw new Error(loginResult.message || 'Login failed');
      }

      toast.success('Successfully logged in');
      router.refresh();
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      disabled={!account || isLoading}
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
