'use client';
import React, { useState } from 'react';
import { Input } from '@app/components/ui/input';
import { Textarea } from '@app/components/ui/textarea';
import { Button } from '@app/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getContract,
  prepareContractCall,
  encode,
  sendTransaction,
} from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { propose } from 'thirdweb/extensions/vote';
import { mintTo, transfer } from 'thirdweb/extensions/erc20';
import {
  useSendTransaction,
  useReadContract,
  useActiveAccount,
  TransactionButton,
} from 'thirdweb/react';
import { client } from '@app/lib/sdk/thirdweb/client';
import VoteABI from '@app/lib/utils/Vote.json';
import CreativeTokenABI from '@app/lib/utils/CreativeToken.json';
import { CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { toTokens } from 'thirdweb';

const votingContract = getContract({
  client,
  chain: defineChain(84532),
  address: '0xEda7BF26C46372512df602e8C9Bd65226A1064f3',
});

const creativeTokenContract = getContract({
  client,
  chain: defineChain(84532),
  address: '0x7A5A934BfeCA5a855550e314E7636efba345940e',
});

export default function Create() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const activeAccount = useActiveAccount();

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Create Proposal</h2>
          <p className="text-muted-foreground">
            Submit a new proposal for voting
          </p>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Proposal Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Proposal Description"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
        </div>
      </div>

      <TransactionButton
        transaction={async () => {
          return propose({
            contract: votingContract,
            targets: [creativeTokenContract.address],
            calldatas: ['0x'],
            values: [0n],
            description: 'content',
          });
        }}
        onTransactionSent={(result) => {
          console.log('Transaction submitted', result.transactionHash);
        }}
        onTransactionConfirmed={(receipt) => {
          console.log('Transaction confirmed', receipt.transactionHash);
        }}
        onError={(error) => {
          console.error('Transaction error', error);
        }}
      >
        Confirm Transaction
      </TransactionButton>
    </div>
  );
}
