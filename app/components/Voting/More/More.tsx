'use client';
import { useState } from 'react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { base } from 'thirdweb/chains';
import { getContract } from 'thirdweb/contract';
import { prepareContractCall } from 'thirdweb/transaction';
import {
  useActiveAccount,
  useReadContract,
  TransactionButton,
} from 'thirdweb/react';
import { shortenAddress } from 'thirdweb/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@app/components/ui/button';
import { toast } from 'sonner';
import Vote from '@app/lib/utils/Vote.json';

export default function MoreOptions() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const searchParams = useSearchParams();
  const [selectedVote, setSelectedVote] = useState<number>(0);

  const proposalId = searchParams.get('proposalId');
  const description = searchParams.get('description');
  const proposer = searchParams.get('proposer');
  const startBlock = searchParams.get('startBlock');
  const endBlock = searchParams.get('endBlock');

  const voteContract = getContract({
    client: client,
    chain: base,
    address: '0x24609A5CBe0f50b67E0E7D7494885a6eB19404BF',
    abi: Vote as any,
  });

  // Get proposal state and votes
  const { data: proposalState } = useReadContract({
    contract: voteContract,
    method: 'state',
    params: [proposalId],
  });

  const { data: proposalVotes } = useReadContract({
    contract: voteContract,
    method: 'proposalVotes',
    params: [proposalId],
  });

  const getProposalState = (state: number) => {
    switch (state) {
      case 0:
        return 'Pending';
      case 1:
        return 'Active';
      case 2:
        return 'Canceled';
      case 3:
        return 'Defeated';
      case 4:
        return 'Succeeded';
      case 5:
        return 'Queued';
      case 6:
        return 'Expired';
      case 7:
        return 'Executed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">
              {description?.split('\n')[0]}
            </h1>
            <p className="mt-4 whitespace-pre-wrap">
              {description?.split('\n').slice(1).join('\n')}
            </p>
          </div>

          <div className="space-y-2">
            <p>
              <strong>Proposer:</strong> {shortenAddress(proposer || '')}
            </p>
            <p>
              <strong>Start Block:</strong> {startBlock}
            </p>
            <p>
              <strong>End Block:</strong> {endBlock}
            </p>
            <p>
              <strong>Status:</strong> {getProposalState(proposalState)}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-xl font-semibold">Current Results</h2>
            {proposalVotes && (
              <div className="space-y-4">
                <div>
                  <p>For: {proposalVotes.forVotes.toString()}</p>
                  <div className="h-2 w-full bg-gray-200">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${
                          (Number(proposalVotes.forVotes) /
                            (Number(proposalVotes.forVotes) +
                              Number(proposalVotes.againstVotes) +
                              Number(proposalVotes.abstainVotes))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p>Against: {proposalVotes.againstVotes.toString()}</p>
                  <div className="h-2 w-full bg-gray-200">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${
                          (Number(proposalVotes.againstVotes) /
                            (Number(proposalVotes.forVotes) +
                              Number(proposalVotes.againstVotes) +
                              Number(proposalVotes.abstainVotes))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p>Abstain: {proposalVotes.abstainVotes.toString()}</p>
                  <div className="h-2 w-full bg-gray-200">
                    <div
                      className="h-full bg-gray-500"
                      style={{
                        width: `${
                          (Number(proposalVotes.abstainVotes) /
                            (Number(proposalVotes.forVotes) +
                              Number(proposalVotes.againstVotes) +
                              Number(proposalVotes.abstainVotes))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeAccount && proposalState === 1 && (
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-xl font-semibold">Cast Your Vote</h2>
              <div className="space-y-4">
                <div className="space-x-4">
                  <Button
                    onClick={() => setSelectedVote(1)}
                    variant={selectedVote === 1 ? 'default' : 'outline'}
                  >
                    For
                  </Button>
                  <Button
                    onClick={() => setSelectedVote(0)}
                    variant={selectedVote === 0 ? 'default' : 'outline'}
                  >
                    Against
                  </Button>
                  <Button
                    onClick={() => setSelectedVote(2)}
                    variant={selectedVote === 2 ? 'default' : 'outline'}
                  >
                    Abstain
                  </Button>
                </div>
                <TransactionButton
                  transaction={() => {
                    const tx = prepareContractCall({
                      contract: voteContract,
                      method: 'castVote',
                      params: [proposalId, selectedVote],
                    });
                    return tx;
                  }}
                  onTransactionConfirmed={() => {
                    toast.success('Vote cast successfully!');
                  }}
                  onError={(error) => {
                    console.error('Error casting vote:', error);
                    toast.error('Failed to cast vote');
                  }}
                >
                  Cast Vote
                </TransactionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
