/**
 * Example implementations showing how to use the error handling utilities
 * in custom API calls and hooks
 */

import {
  fetchWithAbortHandler,
  createAbortControllerWithTimeout,
  isAbortError,
} from './errorHandler';

/**
 * Example 1: Fetch with timeout and abort handling
 */
export async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number = 10000
): Promise<T> {
  const controller = createAbortControllerWithTimeout(timeoutMs);

  try {
    return await fetchWithAbortHandler<T>(url, {
      signal: controller.signal,
      onAbort: () => {
        console.warn(`Request to ${url} was aborted`);
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      // Handle abort specifically - maybe show a timeout message to user
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Example 2: Fetch that can be cancelled manually
 */
export class CancellableRequest<T> {
  private controller: AbortController;

  constructor() {
    this.controller = new AbortController();
  }

  async fetch(url: string, init?: RequestInit): Promise<T> {
    try {
      return await fetchWithAbortHandler<T>(url, {
        ...init,
        signal: this.controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        console.debug('Request was cancelled:', url);
        throw new Error('Request cancelled by user');
      }
      throw error;
    }
  }

  cancel(): void {
    this.controller.abort();
  }
}

/**
 * Example 3: React hook with abort handling
 */
import { useEffect, useState } from 'react';

export function useFetchData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchWithAbortHandler<T>(url, {
      signal: controller.signal,
      onAbort: () => {
        // Component unmounted or url changed
        console.debug('Fetch aborted:', url);
      },
    })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          // Only set error if it wasn't an abort
          setError(err);
          setLoading(false);
        }
        // If it was an abort, don't update state (component unmounted)
      });

    // Cleanup: abort fetch if component unmounts or url changes
    return () => {
      controller.abort();
    };
  }, [url]);

  return { data, loading, error };
}

/**
 * Example 4: Parallel requests with individual abort handling
 */
export async function fetchMultiple<T>(urls: string[]): Promise<T[]> {
  const requests = urls.map((url) => {
    const controller = createAbortControllerWithTimeout(10000);

    return fetchWithAbortHandler<T>(url, {
      signal: controller.signal,
    }).catch((error) => {
      if (isAbortError(error)) {
        console.warn(`Request to ${url} timed out`);
        return null; // Return null for failed requests
      }
      throw error;
    });
  });

  const results = await Promise.all(requests);
  // Filter out null values (aborted/timed out requests)
  return results.filter((result): result is Awaited<T> => result !== null) as T[];
}

/**
 * Example 5: Retry logic with exponential backoff (excluding abort errors)
 */
export async function fetchWithRetry<T>(
  url: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = createAbortControllerWithTimeout(10000);
      return await fetchWithAbortHandler<T>(url, {
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort errors
      if (isAbortError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Request failed after retries');
}

