import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

export const action = createSafeActionClient({
  handleServerError: (error: unknown) => {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  },
});

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
