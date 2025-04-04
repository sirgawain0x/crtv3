import { useRequireAuth } from '@app/hooks/use-auth';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  fallback = <DefaultFallback />,
}: ProtectedRouteProps) {
  return (
    <Suspense fallback={fallback}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useRequireAuth();

  if (isLoading) {
    return <DefaultFallback />;
  }

  return <>{children}</>;
}

function DefaultFallback() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
