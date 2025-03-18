import { useEffect, useState, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { logout } from '@app/api/auth/thirdweb/authentication';

export function useAuth() {
  const activeAccount = useActiveAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });
      setIsAuthenticated(response.ok);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (activeAccount) {
      checkAuth();
    } else {
      setIsAuthenticated(false);
    }
  }, [activeAccount, checkAuth]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      // We don't disconnect the wallet here, so isConnected will stay true
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
    checkAuth, // Expose checkAuth function to force auth state refresh
  };
}
