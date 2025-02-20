'use client';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import Link from 'next/link';
import { client } from '@app/lib/sdk/thirdweb/client';
import { base } from 'thirdweb/chains';
import { FaUsers, FaCertificate } from 'react-icons/fa';
import { useActiveAccount, useReadContract } from 'thirdweb/react';
import { getContract } from 'thirdweb';
import { Label } from '../ui/label';
import { ROLES, CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { Card } from '@app/components/Voting/Card';
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
  const activeAccount = useActiveAccount();

  const voteContract = getContract({
    client: client,
    chain: base,
    address: '0x24609A5CBe0f50b67E0E7D7494885a6eB19404BF',
    abi: VoteABI as any,
  });

  const { data: proposals = [], isLoading } = useReadContract({
    contract: voteContract,
    method: 'getAllProposals',
    params: [],
  });

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

      {activeAccount && (
        <div className="mt-8 flex justify-end">
          <Link href="/vote/create">
            <Button>Create Proposal</Button>
          </Link>
        </div>
      )}
    </div>
  );
};
export default Vote;
