import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type { ActionResponse } from "@/lib/types/actions";
import { submitSnapshotProposal } from "@/lib/sdk/snapshot/snapshot-proposal-wrapper";

const actionClient = createSafeActionClient();

const createProposalSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(3, "Content is required"),
  choices: z.array(z.string().min(1)).min(2, "At least two choices required"),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  address: z.string().min(1, "Wallet address required"),
  chainId: z.number().int().positive(),
  signature: z.string().min(1, "Signature is required"),
  proposalPayload: z.record(z.unknown()),
});

export const createProposal = actionClient
  .schema(createProposalSchema)
  .action(async ({ parsedInput }) => {
    const { address, end, start, signature, proposalPayload } = parsedInput;

    if (!address)
      return {
        success: false,
        error: "Wallet address required",
      } as ActionResponse;

    if (end <= start)
      return {
        success: false,
        error: "End time must be after start time",
      } as ActionResponse;

    try {
      // Submit the pre-signed proposal to Snapshot
      // The proposal payload already includes the block number from the client
      const result = await submitSnapshotProposal({
        address,
        signature,
        proposal: proposalPayload,
      });

      if ("error" in result) {
        console.error("Snapshot proposal error:", result.error);
        return { success: false, error: result.error } as ActionResponse;
      }

      return { success: true, data: { id: result.id } } as ActionResponse<{
        id: string;
      }>;
    } catch (error) {
      console.error("Error creating proposal:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create proposal";
      return {
        success: false,
        error: errorMessage,
      } as ActionResponse;
    }
  });
