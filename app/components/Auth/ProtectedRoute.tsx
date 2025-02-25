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
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-red-800 text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-red-600">{error || 'You do not have access to this page'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
