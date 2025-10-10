"use client";

import { useEffect, useRef } from 'react';
import { useUser } from '@account-kit/react';
import { toast } from 'sonner';

/**
 * Monitor auth state transitions and handle cleanup
 * Helps debug and recover from stuck auth states
 */
export function useAuthStateMonitor() {
  const user = useUser();
  const previousUserRef = useRef(user);
  const logoutToastShownRef = useRef(false);

  useEffect(() => {
    const previousUser = previousUserRef.current;
    
    // User transitioned from logged in to logged out
    if (previousUser && !user) {
      console.log('🔴 User logged out/timed out');
      
      // Show toast only once
      if (!logoutToastShownRef.current) {
        toast.info('Session ended. Click "Get Started" to reconnect.');
        logoutToastShownRef.current = true;
      }
      
      // Clear any stale auth state from localStorage
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.includes('auth') || key?.includes('session')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.warn('Could not clear auth localStorage:', e);
      }
    }
    
    // User logged in
    if (!previousUser && user) {
      console.log('🟢 User logged in:', user.address);
      logoutToastShownRef.current = false;
    }
    
    previousUserRef.current = user;
  }, [user]);

  return { currentUser: user, previousUser: previousUserRef.current };
}

