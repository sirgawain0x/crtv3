'use client';
import React, { useState } from 'react';
import { Input } from '@app/components/ui/input';
import { Textarea } from '@app/components/ui/textarea';
import { Button } from '@app/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getContract, prepareContractCall, encode } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import {
  useSendTransaction,
  useReadContract,
  useActiveAccount,
} from 'thirdweb/react';
import { client } from '@app/lib/sdk/thirdweb/client';
import VoteABI from '@app/lib/utils/Vote.json';
import CreativeTokenABI from '@app/lib/utils/CreativeToken.json';
import { CREATIVE_ADDRESS } from '@app/lib/utils/context';

const votingContract = getContract({
  client,
  chain: defineChain(8453),
  address: '0x24609A5CBe0f50b67E0E7D7494885a6eB19404BF',
});

const creativeTokenContract = getContract({
  client,
  chain: defineChain(8453),
  address: '0x4B62D9b3DE9FAB98659693c9ee488D2E4eE56c44',
});

export default function Create() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const activeAccount = useActiveAccount();

  // Example function to create a token transfer transaction
  const createTransferTransaction = () => {
    return prepareContractCall({
      contract: creativeTokenContract,
      method: 'function transfer(address to, uint256 amount)',
      params: [
        `${activeAccount?.address}`, // Replace with actual address
        100n, // Replace with actual amount
      ],
    });
  };

  const { mutate: sendTx } = useSendTransaction();

  const handleProposalSubmission = async () => {
    if (!activeAccount) {
      toast.error('You must be logged in to create a proposal.');
      return;
    }

    try {
      // 1. Prepare the external contract call
      const transferTransaction = createTransferTransaction();

      // 2. Encode the transaction
      const encodedCall = await encode(transferTransaction);

      // 3. Prepare the governance proposal
      const proposalTransaction = prepareContractCall({
        contract: votingContract,
        method:
          'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description)',
        params: [
          [creativeTokenContract.address], // Targets array
          [0n], // Values array
          [encodedCall], // Encoded calldata array
          content, // Description
        ],
      });

      // 4. Send the transaction
      sendTx(proposalTransaction, {
        onSuccess: () => {
          toast.success('Proposal created successfully!');
          router.push('/vote');
        },
        onError: (error) => {
          console.error('Error creating proposal:', error);
          toast.error(
            error?.message || 'Failed to create proposal. Please try again.',
          );
        },
      });
    } catch (error) {
      console.error('Error preparing proposal:', error);
      toast.error('Failed to prepare proposal. Please try again.');
    }
  };

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

      <Button
        onClick={handleProposalSubmission}
        disabled={!title || !content}
        className="w-full"
      >
        Create Proposal
      </Button>
    </div>
  );
}
