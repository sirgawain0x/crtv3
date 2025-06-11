'use client';

export function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-pink-500"></div>
    </div>
  );
}
