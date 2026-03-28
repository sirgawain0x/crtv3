import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

const actionClient = createSafeActionClient();

const submitBetSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  answer: z.string().min(1, "Answer is required"),
  bond: z.string().min(1, "Bond amount is required"),
  transactionHash: z.string().min(1, "Transaction hash is required"),
});

export const submitBet = actionClient
  .schema(submitBetSchema)
  .action(async ({ parsedInput }) => {
    const { questionId, answer, bond, transactionHash } = parsedInput;

    // In a production app, you might want to:
    // 1. Store the bet in a database
    // 2. Track bet history
    // 3. Validate the transaction hash

    return { id: questionId, answer, bond, transactionHash };
  });
