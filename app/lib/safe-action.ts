import { createSafeActionClient } from 'next-safe-action';
import type { ActionResponse } from '../types/actions';
import { ZodError } from 'zod';

export const action = createSafeActionClient({
  handleServerError: (error: unknown) => {
    // Log server errors here
    console.error('Server action error:', error);

    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
      } as ActionResponse;
    }

    return {
      success: false,
      error: 'An unexpected error occurred',
    } as ActionResponse;
  },
});

export const handleActionError = (error: unknown): ActionResponse => {
  console.error('Action error:', error);

  if (error instanceof ZodError) {
    return {
      success: false,
      error:
        'Validation failed: ' + error.errors.map((e) => e.message).join(', '),
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
  };
};
