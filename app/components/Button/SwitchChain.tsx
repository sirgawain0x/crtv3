import React from 'react';
import { useChain } from '@account-kit/react';
import { Button } from '@app/components/ui/button';
// Assuming the chain base is defined in your initial createConfig call
import { base } from '@account-kit/infra';

export default function SwitchChain() {
  const { chain, setChain, isSettingChain } = useChain();

  return (
    <div>
      <p>Current Chain: {chain.id}</p>
      <Button
        onClick={() => setChain({ chain: base })}
        disabled={isSettingChain}
      >
        Switch Chain
      </Button>
    </div>
  );
}
