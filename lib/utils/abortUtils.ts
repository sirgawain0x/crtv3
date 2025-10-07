/**
 * Utility functions for handling AbortController and abort signals safely
 */

export class SafeAbortController {
  private controller: AbortController;
  private isAborted: boolean = false;

  constructor() {
    this.controller = new AbortController();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  abort(reason?: string): void {
    if (!this.isAborted) {
      this.isAborted = true;
      this.controller.abort(reason);
    }
  }

  isAbortedSignal(): boolean {
    return this.isAborted || this.controller.signal.aborted;
  }
}

/**
 * Safely execute an async function with abort signal handling
 */
export async function safeAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await fn(signal || new AbortController().signal);
  } catch (error) {
    // Check if it's an abort error and handle gracefully
    if (error instanceof Error && (
      error.name === 'AbortError' || 
      error.message.includes('aborted') ||
      error.message.includes('signal is aborted')
    )) {
      console.warn('Operation was aborted:', error.message);
      throw new Error('Operation was cancelled');
    }
    throw error;
  }
}

/**
 * Create a timeout-based AbortController
 */
export function createTimeoutController(timeoutMs: number): SafeAbortController {
  const controller = new SafeAbortController();
  
  const timeout = setTimeout(() => {
    controller.abort(`Operation timed out after ${timeoutMs}ms`);
  }, timeoutMs);

  // Clean up timeout when signal is aborted
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeout);
  });

  return controller;
}

/**
 * Check if an error is an abort-related error
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('aborted') ||
      error.message.includes('signal is aborted') ||
      error.message.includes('aborted without reason')
    );
  }
  return false;
}

/**
 * Safely handle fetch with abort signal
 */
export async function safeFetch(
  url: string, 
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (isAbortError(error)) {
      console.warn('Fetch request was aborted:', url);
      throw new Error('Request was cancelled');
    }
    throw error;
  }
}
