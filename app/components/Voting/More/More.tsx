'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@app/components/ui/button';
import { toast } from 'sonner';
import VoteABI from '@app/lib/utils/Vote.json';
import { useReadContract, useWriteContract } from 'wagmi';
import type { Abi } from 'viem';
import { useUser } from '@account-kit/react';
import { userToAccount } from '@app/lib/types/account';

export default function MoreOptions() {
  const router = useRouter();
  const user = useUser();
  const account = userToAccount(user);
  const searchParams = useSearchParams();
  const [selectedVote, setSelectedVote] = useState<number>(0);

  const proposalId = searchParams.get('proposalId');
  const description = searchParams.get('description');
  const proposer = searchParams.get('proposer');
  const startBlock = searchParams.get('startBlock');
  const endBlock = searchParams.get('endBlock');

  // Get proposal state and votes
  const { data: proposalState } = useReadContract({
    address: '0x24609A5CBe0f50b67E0E7D7494885a6eB19404BF',
    abi: VoteABI[0].abi as unknown as Abi,
    functionName: 'state',
    args: [proposalId],
  }) as { data: number };

  const { data: proposalVotes } = useReadContract({
    address: '0x24609A5CBe0f50b67E0E7D7494885a6eB19404BF',
    abi: VoteABI[0].abi as unknown as Abi,
    functionName: 'proposalVotes',
    args: [proposalId],
  }) as {
    data: { forVotes: bigint; againstVotes: bigint; abstainVotes: bigint };
  };

  const { writeContract, isPending } = useWriteContract();

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

  const handleVote = async () => {
    try {
      if (!writeContract) return;
      await writeContract({
        address: '0x24609A5CBe0f50b67E0E7D7494885a6eB19404BF',
        abi: VoteABI[0].abi as unknown as Abi,
        functionName: 'castVote',
        args: [proposalId, selectedVote],
      });
      toast.success('Vote cast successfully');
    } catch (error) {
      toast.error('Failed to cast vote');
      console.error(error);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

          {account && proposalState === 1 && (
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
                <Button onClick={handleVote} disabled={isPending}>
                  Cast Vote
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
