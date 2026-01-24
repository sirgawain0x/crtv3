import { z } from "zod";
import { serverLogger } from "@/lib/utils/logger";

const isProduction = process.env.NODE_ENV === "production";

// Define required vs optional environment variables
const configSchema = z.object({
  // Required for core functionality
  alchemyApiKey: z.string().min(1, "NEXT_PUBLIC_ALCHEMY_API_KEY is required"),
  supabaseUrl: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  supabaseAnonKey: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  supabaseServiceRoleKey: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  livepeerApiKey: z.string().min(1, "LIVEPEER_API_KEY is required"),
  
  // Optional but recommended
  alchemyPaymasterPolicyId: z.string().optional(),
  livepeerWebhookId: z.string().optional(),
  coinbaseCdpApiKeyId: z.string().optional(),
  coinbaseCdpApiKeySecret: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

// Load config from environment variables
export const config: Config = {
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  livepeerApiKey: process.env.LIVEPEER_API_KEY || "",
  alchemyPaymasterPolicyId: process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID,
  livepeerWebhookId: process.env.LIVEPEER_WEBHOOK_ID,
  coinbaseCdpApiKeyId: process.env.COINBASE_CDP_API_KEY_ID,
  coinbaseCdpApiKeySecret: process.env.COINBASE_CDP_API_KEY_SECRET,
};

// Validate config with strict error handling
const validationResult = configSchema.safeParse(config);

if (!validationResult.success) {
  const errors = validationResult.error.errors.map((err) => 
    `${err.path.join('.')}: ${err.message}`
  ).join('\n');
  
  const errorMessage = `Environment variable validation failed:\n${errors}`;
  
  if (isProduction) {
    // Fail fast in production - missing required env vars will cause runtime errors
    throw new Error(errorMessage);
  } else {
    // Warn in development but don't crash
    serverLogger.warn('Environment variable validation warning:', errorMessage);
    serverLogger.warn('Some features may not work correctly. Please check your .env.local file.');
  }
}
