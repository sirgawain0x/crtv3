'use client';

import { useOrbis } from '../../../context/orbis-provider';
import { Button } from '../ui/button';

export function OrbisAuth() {
  const { isConnected, connect, disconnect } = useOrbis();

  return (
    <div className="flex items-center gap-4">
      {isConnected ? (
        <Button variant="outline" onClick={disconnect}>
          Disconnect DID
        </Button>
      ) : (
        <Button onClick={connect}>Connect DID</Button>
      )}
    </div>
  );
}
