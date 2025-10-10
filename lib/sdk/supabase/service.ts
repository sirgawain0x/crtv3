import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with service role privileges
 * This bypasses Row Level Security (RLS) policies and should only be used in server-side code
 * 
 * Use cases:
 * - Admin operations that need to bypass RLS
 * - Background jobs and cron tasks
 * - System-level operations (like video asset creation with smart account addresses)
 * 
 * WARNING: Never expose the service role key to the client side!
 */
export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Singleton instance of the Supabase service client
 * Returns null if the service role key is not available
 */
function initializeServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Return null if environment variables are not set
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    console.error('Failed to create supabase service client:', error);
    return null;
  }
}

export const supabaseService = initializeServiceClient();
