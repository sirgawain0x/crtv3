import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// Import the response types from the API route
const AuthResponseSchema = z.object({
  user: z.object({
    address: z.string(),
    exp: z.number(),
    iat: z.number(),
    sub: z.string(),
  }),
});

type AuthResponse = z.infer<typeof AuthResponseSchema>;

async function checkAuth(): Promise<AuthResponse> {
  const response = await fetch('/api/auth/check');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Authentication failed');
  }

  const data = await response.json();
  return AuthResponseSchema.parse(data);
}

export function useAuth() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: checkAuth,
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// Optional: Add a hook for protected routes
export function useRequireAuth() {
  const { isLoading, error, data } = useAuth();

  if (isLoading) return { isLoading: true, user: null };
  if (error) throw error; // This will be caught by your error boundary
  if (!data?.user) throw new Error('Unauthorized');

  return { isLoading: false, user: data.user };
}
