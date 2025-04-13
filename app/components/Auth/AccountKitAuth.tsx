'use client';

import { type ReactNode } from 'react';
import {
  useAuthModal,
  useLogout,
  useSignerStatus,
  useUser,
  type User,
} from '@account-kit/react';
import { Button } from '@/app/components/ui/button';
import Skeleton from '@/app/components/ui/skeleton';
import { toast } from 'sonner';

interface AuthContainerProps {
  children: ReactNode;
}

function AuthContainer({ children }: AuthContainerProps) {
  return (
    <div className="flex min-h-[200px] w-full max-w-sm flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center shadow-sm">
      {children}
    </div>
  );
}

export function AccountKitAuth() {
  const user = useUser();
  const { openAuthModal } = useAuthModal();
  const signerStatus = useSignerStatus();
  const { logout } = useLogout();

  // Handle logout with proper error handling
  async function handleLogout() {
    try {
      await logout();
      toast.success('Logged out successfully', {
        description: 'You have been logged out of your account',
      });
    } catch (error) {
      toast.error('Error logging out', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  // Handle login modal with error handling
  async function handleLogin() {
    try {
      await openAuthModal();
    } catch (error) {
      toast.error('Error opening login modal', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  if (signerStatus.isInitializing) {
    return (
      <AuthContainer>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </AuthContainer>
    );
  }

  if (!user) {
    return (
      <AuthContainer>
        <h2 className="text-lg font-semibold">Welcome</h2>
        <p className="text-sm text-muted-foreground">
          Please login to continue
        </p>
        <Button onClick={handleLogin} className="w-full">
          Login
        </Button>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Welcome back!</h2>
        <p className="text-sm text-muted-foreground">
          Logged in as {user.address ?? 'Anonymous User'}
        </p>
      </div>
      <Button onClick={handleLogout} variant="outline" className="w-full">
        Log out
      </Button>
    </AuthContainer>
  );
}
