import { z } from "zod";

const configSchema = z.object({
  alchemyApiKey: z.string().optional(),
  subgraphQueryKey: z.string().optional(),
  // ... any other config values
});

export type Config = z.infer<typeof configSchema>;

// Load config from environment variables
export const config: Config = {
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  subgraphQueryKey: process.env.SUBGRAPH_QUERY_KEY,
  // ... any other config values
};

// Validate config (with error handling)
try {
  configSchema.parse(config);
} catch (error) {
  console.warn('Config validation warning:', error);
  // Don't throw here to prevent app crashes
}
