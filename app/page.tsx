"use client";

import NonLoggedInView from '@/components/home-page/NonLoggedInView';
import { useAuthStateMonitor } from '@/lib/hooks/accountkit/useAuthStateMonitor';

export default function Home() {
  // Monitor auth state on the landing page
  useAuthStateMonitor();

  return (
    <main className="flex min-h-screen flex-col">
      <NonLoggedInView />
    </main>
  );
}
