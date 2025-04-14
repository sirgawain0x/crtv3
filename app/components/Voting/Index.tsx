'use client';
import { useState } from 'react';
import { useClient, useReadContract, useWriteContract } from 'wagmi';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import Link from 'next/link';
import { FaUsers, FaCertificate } from 'react-icons/fa';
import { Abi } from 'viem';
import { Label } from '../ui/label';
import { ROLES, CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { Card } from './Card';
import { useUser } from '@account-kit/react';
import { userToAccount } from '@app/lib/types/account';
import { VOTE_CONTRACT_ADDRESS } from '@app/lib/constants/contracts';
import VoteABI from '@app/lib/utils/Vote.json';

// Interface for proposal data from smart contract
interface Proposal {
  proposalId: bigint;
  proposer: string;
  targets: string[];
  values: bigint[];
  signatures: string[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  description: string;
}

const Vote = () => {
  const [selectedValue, setSelectedValue] = useState('active');
  const user = useUser();
  const account = userToAccount(user);

  const { data: proposals = [], isLoading } = useReadContract({
    address: VOTE_CONTRACT_ADDRESS,
    abi: VoteABI.abi as Abi,
    functionName: 'getAllProposals',
  }) as { data: Proposal[]; isLoading: boolean };

  const filteredProposals = proposals.filter((proposal: Proposal) => {
    const currentBlock = BigInt(Date.now()); // This should be replaced with actual block number
    if (selectedValue === 'active') {
      return (
        currentBlock >= proposal.startBlock && currentBlock <= proposal.endBlock
      );
    } else if (selectedValue === 'closed') {
      return currentBlock > proposal.endBlock;
    }
    return true;
  });

  if (!account) {
    return (
      <div className="p-4 text-center">
        <p>Please connect your wallet to access voting features</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <RadioGroup
          defaultValue="active"
          onValueChange={setSelectedValue}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="active" id="active" />
            <Label htmlFor="active">Active Proposals</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="closed" id="closed" />
            <Label htmlFor="closed">Closed</Label>
          </div>
        </RadioGroup>
      </div>

      {isLoading ? (
        <div>Loading proposals...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProposals.map((proposal: Proposal) => (
            <Link
              href={{
                pathname: '/vote/more',
                query: {
                  proposalId: proposal.proposalId.toString(),
                  description: proposal.description,
                  proposer: proposal.proposer,
                  startBlock: proposal.startBlock.toString(),
                  endBlock: proposal.endBlock.toString(),
                },
              }}
              key={proposal.proposalId.toString()}
            >
              <Card
                title={proposal.description.split('\n')[0]}
                body={proposal.description.split('\n').slice(1).join('\n')}
                creator={proposal.proposer}
                start={Number(proposal.startBlock).toString()}
                end={Number(proposal.endBlock).toString()}
                state="active"
                core={false}
              />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Link href="/vote/create">
          <Button>Create Proposal</Button>
        </Link>
      </div>
    </div>
  );
};

export default Vote;
