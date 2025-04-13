'use client';

import Content from '@app/components/Content/Content';
import {
  useAuthModal,
  useLogout,
  useSignerStatus,
  useUser,
} from '@account-kit/react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Content />
    </main>
  );
}
