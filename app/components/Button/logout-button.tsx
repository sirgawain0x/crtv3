'use client';

import { Button } from '../ui/button';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@app/lib/services/auth';
import { toast } from 'sonner';

export const LogOutButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    try {
      setIsLoading(true);

      const result = await AuthService.logout();
      if (!result.success) {
        throw new Error(result.message || 'Logout failed');
      }

      toast.success('Successfully logged out');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to logout');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant="destructive"
      className="min-w-[100px]"
    >
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
