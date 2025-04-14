'use client';

import { useState } from 'react';
import type { ActionResponse } from '../types/actions';

interface UseActionOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
}

interface UseActionResult<TInput, TData> {
  execute: (input: TInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  data: TData | null;
}

export function useAction<TInput, TData>(
  action: (input: TInput) => Promise<ActionResponse<TData>>,
  options: UseActionOptions<TData> = {},
): UseActionResult<TInput, TData> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const execute = async (input: TInput) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await action(input);

      if (!result.success) {
        setError(result.error || 'An error occurred');
        options.onError?.(result.error || 'An error occurred');
        return;
      }

      setData(result.data as TData);
      options.onSuccess?.(result.data as TData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    error,
    data,
  };
}
