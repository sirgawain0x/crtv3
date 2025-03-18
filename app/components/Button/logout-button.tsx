'use client';

import { useAuth } from '@app/hooks/useAuth';
import { Button } from '../ui/button';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const LogOutButton: React.FC = () => {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    try {
      setIsLoading(true);
      await logout();
      // Force a router refresh to update the UI
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading} variant="destructive">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging out...
        </>
      ) : (
        'Log out'
      )}
    </Button>
  );
};
