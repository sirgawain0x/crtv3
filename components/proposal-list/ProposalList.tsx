"use client";

import { useState } from "react";
import { useSuspenseQuery, gql } from "@apollo/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useChain, useAuthModal, useSigner } from "@account-kit/react";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { createVote } from "@/app/vote/[id]/actions";
import { SNAPSHOT_SPACE } from "@/context/context";
import { LinkedIdentityDisplay } from "@/components/vote/LinkedIdentityDisplay";

/**
 * Extract Smart Wallet address from proposal plugins metadata
 */
function extractSmartWalletFromPlugins(plugins: string | null | undefined): string | null {
  if (!plugins) return null;
  try {
    const parsed = typeof plugins === "string" ? JSON.parse(plugins) : plugins;
    return parsed?.creativeTv?.smartWallet || null;
  } catch {
    return null;
  }
}

function ProposalList({ space }: ProposalListProps) {
  const { data, error } = useSuspenseQuery<{ proposals: Proposal[] }>(
    GET_PROPOSALS,
    {
      variables: { space, first: 10 },
      errorPolicy: "all",
    }
  );

  // Log for debugging
  if (typeof window !== "undefined") {
    console.log("ProposalList query:", {
      space,
      hasData: !!data,
      proposalCount: data?.proposals?.length || 0,
      error: error?.message,
    });
  }

  if (error) {
    console.error("ProposalList error:", error);
    return (
      <div className="p-4 text-red-500">
        <div className="font-semibold">Failed to load proposals</div>
        <div className="text-sm mt-1">{error.message}</div>
        <div className="text-xs mt-2 text-gray-400">
          Space: {space}
        </div>
        {error.networkError && (
          <div className="text-xs mt-1 text-gray-400">
            Network error: {error.networkError.message}
          </div>
        )}
      </div>
    );
  }
  
  if (!data?.proposals?.length) {
    return (
      <div className="p-4">
        <div>No proposals found in space: <span className="font-mono text-sm">{space}</span></div>
        <div className="text-sm text-gray-500 mt-2">
          {data?.proposals ? "The space exists but has no proposals yet." : "Unable to query the space."}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full overflow-x-auto">
      {data.proposals.map((proposal) => {
        // Calculate if voting is currently active
        const now = Math.floor(Date.now() / 1000);
        const isVotingActive = now >= proposal.start && now <= proposal.end;
        const isVotingClosed = now > proposal.end;
        const isVotingPending = now < proposal.start;

        // Determine status badge styling
        const getStatusBadge = () => {
          if (isVotingActive) {
            return (
              <Badge 
                variant="default" 
                className="bg-green-500 hover:bg-green-600 text-white border-green-600"
              >
                <Clock className="h-3 w-3 mr-1" />
                Active
              </Badge>
            );
          } else if (isVotingClosed) {
            return (
              <Badge 
                variant="secondary" 
                className="bg-gray-500 hover:bg-gray-600 text-white border-gray-600"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Closed
              </Badge>
            );
          } else {
            return (
              <Badge 
                variant="outline" 
                className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
              >
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            );
          }
        };

        return (
          <Link key={proposal.id} href={`/vote/${proposal.id}`} className="block">
            <Card 
              className={`p-2 sm:p-4 w-full cursor-pointer hover:shadow-lg transition-shadow ${
                isVotingActive 
                  ? "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/20" 
                  : isVotingClosed
                  ? "border-l-4 border-l-gray-400 bg-gray-50/30 dark:bg-gray-950/20 opacity-90"
                  : "border-l-4 border-l-yellow-400 bg-yellow-50/30 dark:bg-yellow-950/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-base sm:text-lg font-semibold truncate flex-1">
                  {proposal.title}
                </h2>
                {getStatusBadge()}
              </div>
              <p className="hidden sm:block text-sm sm:text-base text-gray-500 mb-2">
                {proposal.body.slice(0, 120)}
                {proposal.body.length > 120 ? "..." : ""}
              </p>
              {proposal.author && (
                <div className="text-xs text-gray-400 mb-2">
                  <LinkedIdentityDisplay
                    authorEOA={proposal.author}
                    smartWalletAddress={extractSmartWalletFromPlugins(proposal.plugins)}
                    showFull={false}
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-400 gap-1 sm:gap-2">
                <span>
                  Start: {new Date(proposal.start * 1000).toLocaleString()}
                </span>
                <span className="hidden sm:inline">|</span>
                <span>End: {new Date(proposal.end * 1000).toLocaleString()}</span>
                <span className="hidden sm:inline">|</span>
                <span>State: {proposal.state}</span>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export { ProposalList, VotingForm };
export default ProposalList;

const GET_PROPOSALS = gql`
  query Proposals($space: String!, $first: Int!) {
    proposals(
      first: $first
      skip: 0
      where: { space_in: [$space] }
      orderBy: "created"
      orderDirection: desc
    ) {
      id
      title
      body
      choices
      start
      end
      snapshot
      state
      author
      plugins
    }
  }
`;

interface ProposalListProps {
  space: string;
}

export interface Proposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: string;
  state: string;
  author?: string;
  plugins?: string;
  scores?: number[];
  scores_total?: number;
  votes?: number;
}

function VotingForm({ proposal }: { proposal: Proposal }) {
  const schema = z.object({
    choice: z.string().min(1, "Please select a choice"),
  });
  const methods = useForm<{ choice: string }>({
    resolver: zodResolver(schema),
    defaultValues: { choice: "" },
  });
  const { handleSubmit, reset } = methods;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { chain } = useChain();
  const { isConnected, walletAddress } = useWalletStatus();
  const { openAuthModal } = useAuthModal();
  
  /**
   * IDENTITY STRATEGY:
   * - Smart Wallet: Primary public identity (what users see)
   * - EOA (walletAddress): Background signing identity for Snapshot
   * 
   * Snapshot requires EOA signatures, so we use walletAddress (EOA) for signing,
   * but the Smart Wallet remains the user's primary identity on Creative TV.
   */
  const signer = useSigner();

  async function onSubmit(values: { choice: string }) {
    setError(null);

    // Validate connection state
    if (!isConnected || !walletAddress || !chain?.id) {
      setError("Please connect your wallet.");
      return;
    }

    // Snapshot requires EOA signature
    if (!signer) {
      setError("Signer not available. Please sign in again.");
      openAuthModal();
      return;
    }

    // Find the choice index (Snapshot uses 1-based indexing)
    const choiceIndex = proposal.choices.findIndex((c) => c === values.choice);
    if (choiceIndex === -1) {
      setError("Invalid choice selected.");
      return;
    }
    // Snapshot uses 1-based indexing for choices
    const snapshotChoice = choiceIndex + 1;

    setIsSubmitting(true);

    try {
      console.log("Starting vote submission...");
      console.log("Using wallet address:", walletAddress);
      console.log("Proposal ID:", proposal.id);
      console.log("Choice:", values.choice, "Index:", snapshotChoice);

      // Prepare EIP-712 typed data for signing (similar to proposal creation)
      const domain = {
        name: "snapshot",
        version: "0.1.4",
      } as const;

      // Snapshot's vote types - must match their schema exactly
      const types = {
        Vote: [
          { name: "from", type: "string" },
          { name: "space", type: "string" },
          { name: "timestamp", type: "uint64" },
          { name: "proposal", type: "string" },
          { name: "choice", type: "uint32" },
          { name: "reason", type: "string" },
          { name: "app", type: "string" },
          { name: "metadata", type: "string" },
        ],
      } as const;

      const now = Math.floor(Date.now() / 1000);

      // Build the message for signing
      const typedMessage = {
        from: walletAddress, // EOA address (Snapshot requires EOA signature)
        space: SNAPSHOT_SPACE,
        timestamp: BigInt(now),
        proposal: proposal.id,
        choice: BigInt(snapshotChoice),
        reason: "",
        app: "creative-tv",
        metadata: JSON.stringify({}),
      };

      console.log("Signing Vote Typed Data:", { domain, types, message: typedMessage });

      // Verify signer is ready
      try {
        const signerAddr = await Promise.race([
          signer.getAddress(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getAddress timed out")), 10000),
          ),
        ]);
        console.log("Signer getAddress():", signerAddr);
        if (signerAddr?.toLowerCase?.() !== walletAddress.toLowerCase()) {
          console.warn("Signer address mismatch");
        }
      } catch (e) {
        console.warn("Signer getAddress failed/timed out:", e);
        setError("Wallet signer is not ready. Please sign in again.");
        openAuthModal();
        return;
      }

      console.log("Using EOA signer.signTypedData (Snapshot-compatible)...");

      const signature = await Promise.race([
        signer.signTypedData({
          domain,
          types,
          primaryType: "Vote",
          message: typedMessage,
        } as any),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Signing timed out after 120s")), 120000),
        ),
      ]);

      console.log("✅ Vote Typed Data Signed successfully:", signature);

      // Prepare EIP-712 envelope for submission
      const envelope = {
        domain,
        types,
        message: {
          from: walletAddress,
          space: SNAPSHOT_SPACE,
          timestamp: now, // number for JSON
          proposal: proposal.id,
          choice: snapshotChoice, // number for JSON
          reason: "",
          app: "creative-tv",
          metadata: JSON.stringify({}),
        },
      };

      console.log("Submitting vote to server...");

      const result = await createVote({
        proposalId: proposal.id,
        choice: snapshotChoice,
        address: walletAddress,
        signature,
        votePayload: envelope,
      });

      if (result?.serverError) {
        console.error("Server error:", result.serverError);
        let errorMsg = result.serverError;
        if (errorMsg.includes("validation failed")) {
          errorMsg =
            "Vote validation failed. Possible reasons:\n• You don't have permission to vote in this space\n• You don't meet the minimum voting power requirement\n• The voting period has ended\n• You've already voted on this proposal";
        }
        setError(errorMsg || "Failed to submit vote.");
        return;
      }

      if (result?.validationErrors) {
        console.error("Validation errors:", result.validationErrors);
        setError("Validation failed. Please check your input.");
        return;
      }

      if (!result?.data) {
        console.error("No data in result:", result);
        setError("Failed to submit vote.");
        return;
      }

      console.log("Vote submitted successfully:", result.data);
      toast.success("Vote submitted successfully!");
      reset();
      // Optionally refresh the page to show updated results
      window.location.reload();
    } catch (error) {
      console.error("Error submitting vote:", error);
      setError(
        error instanceof Error ? error.message : "Failed to submit vote. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField
          name="choice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vote</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col gap-2"
                >
                  {proposal.choices.map((choice, idx) => (
                    <div key={choice} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={choice}
                        id={`choice-${proposal.id}-${idx}`}
                      />
                      <Label
                        htmlFor={`choice-${proposal.id}-${idx}`}
                        className="cursor-pointer font-normal"
                      >
                        {choice}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <div className="text-red-500 text-sm font-medium mt-2 whitespace-pre-line">
            {error}
          </div>
        )}
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            "Submit Vote"
          )}
        </Button>
      </form>
    </FormProvider>
  );
}
