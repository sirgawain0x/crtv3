'use client';

import { useChain } from '@account-kit/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { supportedChains } from '@app/config';
import type { ChainConfig } from '@app/config';

export function ChainSelector() {
  const { chain, setChain, isSettingChain } = useChain();

  return (
    <Select
      value={chain.id.toString()}
      onValueChange={(value) => {
        const selectedChain = supportedChains.find(
          (c: ChainConfig) => c.chain.id.toString() === value,
        );
        if (selectedChain) {
          setChain({ chain: selectedChain.chain });
        }
      }}
      disabled={isSettingChain}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Chain" />
      </SelectTrigger>
      <SelectContent>
        {supportedChains.map((c: ChainConfig) => (
          <SelectItem key={c.chain.id} value={c.chain.id.toString()}>
            {c.chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
