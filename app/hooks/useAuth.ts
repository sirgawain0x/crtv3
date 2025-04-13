'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@account-kit/react';
import { logout, checkAuth } from '@app/api/auth/authentication';

export function useAuth() {
  const user = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    if (isChecking) return;

    try {
      setIsChecking(true);
      const isAuthed = await checkAuth();
      setIsAuthenticated(isAuthed);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Check auth status when account changes
  useEffect(() => {
    if (!user) {
      setIsAuthenticated(false);
      return;
    }

    checkAuthStatus();
  }, [user, checkAuthStatus]);

  // Poll auth status every 5 seconds when connected
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkAuthStatus, 5000);
    return () => clearInterval(interval);
  }, [user, checkAuthStatus]);

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
    isConnected: !!user,
    isAuthenticated,
    address: user?.address,
    logout: handleLogout,
    checkAuth: checkAuthStatus,
  };
}
