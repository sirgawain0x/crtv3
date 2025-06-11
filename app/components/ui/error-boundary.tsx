'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from './button';
import { cn } from '@app/lib/utils';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
}

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        className="border-destructive/50 hover:bg-destructive/10"
      >
        Try again
      </Button>
    </div>
  );
}

export function ErrorBoundary({ children, className }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        // Log to your error reporting service
        console.error('Error caught by boundary:', error);
      }}
    >
      <div className={cn('w-full', className)}>{children}</div>
    </ReactErrorBoundary>
  );
}
