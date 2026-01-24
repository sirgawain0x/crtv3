import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { submitSnapshotVote } from "@/lib/sdk/snapshot/snapshot-vote-wrapper";
import { serverLogger } from '@/lib/utils/logger';


const actionClient = createSafeActionClient();

const createVoteSchema = z.object({
  proposalId: z.string().min(1, "Proposal ID is required"),
  choice: z.number().int().min(1, "Choice must be at least 1"),
  address: z.string().min(1, "Wallet address required"),
  signature: z.string().min(1, "Signature is required"),
  votePayload: z.record(z.unknown()),
});

export const createVote = actionClient
  .schema(createVoteSchema)
  .action(async ({ parsedInput }) => {
    const { address, signature, votePayload } = parsedInput;

    if (!address) {
      throw new Error("Wallet address required");
    }

    // Submit the pre-signed vote to Snapshot
    const result = await submitSnapshotVote({
      address,
      signature,
      vote: votePayload,
    });

    if ("error" in result) {
      serverLogger.error("Snapshot vote error:", result.error);
      throw new Error(result.error);
    }

    // Return data directly - next-safe-action will wrap it in { data: ... }
    return { id: result.id };
  });
