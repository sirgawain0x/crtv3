'use client';

import { useUser } from '@account-kit/react';
import { useEffect, useState } from 'react';
import { checkUnlockAccess } from '@app/lib/services/unlock';

export function useUnlockAccess() {
  const user = useUser();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (!user?.address) {
        setHasAccess(false);
        return;
      }

      setIsLoading(true);
      try {
        const access = await checkUnlockAccess(user.address);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking Unlock access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [user?.address]);

  return { hasAccess, isLoading };
}
