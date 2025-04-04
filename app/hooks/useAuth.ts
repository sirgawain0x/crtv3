import { useEffect, useState, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { logout } from '@app/api/auth/thirdweb/authentication';

export function useAuth() {
  const activeAccount = useActiveAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkAuth = useCallback(async () => {
    if (isChecking) return;

    try {
      setIsChecking(true);
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      const isAuthed = response.ok;
      if (isAuthed !== isAuthenticated) {
        console.log(
          'Auth status changed:',
          isAuthed ? 'authenticated' : 'not authenticated',
        );
        setIsAuthenticated(isAuthed);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, isAuthenticated]);

  // Check auth status when account changes
  useEffect(() => {
    if (activeAccount) {
      checkAuth();
    } else {
      setIsAuthenticated(false);
    }
  }, [activeAccount, checkAuth]);

  // Poll auth status every 5 seconds when connected
  useEffect(() => {
    if (!activeAccount) return;

    const interval = setInterval(() => {
      checkAuth();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeAccount, checkAuth]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  return {
    isConnected: !!activeAccount,
    isAuthenticated,
    address: activeAccount?.address,
    logout: handleLogout,
    checkAuth,
  };
}
