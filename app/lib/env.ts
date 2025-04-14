import { z } from 'zod';

const envSchema = z.object({
  // Public Environment Variables
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),
  NEXT_PUBLIC_AUTH_DOMAIN: z.string().min(1),

  // Private Environment Variables
  DATABASE_URL: z.string().url(),
  UPSTASH_REDIS_REST_KV_REST_API_URL: z.string().url(),
  UPSTASH_REDIS_REST_KV_REST_API_TOKEN: z.string().min(1),

  // Development Settings
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { fieldErrors } = error.flatten();
      const errorMessage = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
        .join('\n');

      throw new Error(`❌ Invalid environment variables:\n${errorMessage}`);
    }

    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// This will give us type-safe environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
