'use client';
import React, { useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import NonLoggedInView from './NonLoggedInView/NonLoggedInView';

const Content = () => {
  const activeAccount = useActiveAccount();
  const [showChild, setShowChild] = useState(false);
  useEffect(() => {
    setShowChild(true);
  }, []);

  if (!showChild) {
    return null;
  }

  // return <>{activeAccount ? <Member /> : <NonLoggedInView />}</>;
  return <>{<NonLoggedInView />}</>;
};

export default Content;
