'use client';

import { GetStartedButton } from '@/components/auth/get-started-button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="mb-8 text-4xl font-bold">Welcome to Our App</h1>
        <p className="mb-8 text-xl">
          Get started with smart accounts, SIWE, OrbisDB, and Unlock Protocol
        </p>
        <GetStartedButton />
      </div>
    </main>
  );
}
