'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useUnlockAccess } from '@app/hooks/useUnlockAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { hasAccess, isLoading, address } = useUnlockAccess();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isLoading && !hasAccess) {
      setError('You need to own a Creator Pass NFT to access this page');
    }
  }, [address, hasAccess, isLoading]);

  // Show loading spinner while checking access
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If no access, show error message
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-800">
            Access Denied
          </h2>
          <p className="text-red-600">
            {error || 'You do not have access to this page'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
