import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

const actionClient = createSafeActionClient();

const createPredictionSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  transactionHash: z.string().min(1, "Transaction hash is required"),
});

export const createPrediction = actionClient
  .schema(createPredictionSchema)
  .action(async ({ parsedInput }) => {
    const { questionId, transactionHash } = parsedInput;

    // In a production app, you might want to:
    // 1. Store the prediction in a database
    // 2. Index the question ID for easier retrieval
    // 3. Validate the transaction hash

    return { id: questionId, transactionHash };
  });
