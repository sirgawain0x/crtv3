'use client';

import React from 'react';
import { useUser } from '@account-kit/react';
import NonLoggedInView from './NonLoggedInView/NonLoggedInView';

export default function Content() {
  const user = useUser();

  // For now, we'll just show NonLoggedInView until we implement the Member view
  return (
    <div className="container mx-auto">
      <NonLoggedInView />
    </div>
  );
}
