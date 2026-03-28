
import { logger } from '@/lib/utils/logger';
/**
 * Utility functions for handling common development errors and warnings
 */

/**
 * Checks if an error is an AbortError that can be safely ignored
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('signal is aborted') ||
      error.message.includes('The operation was aborted')
    );
  }
  return false;
}

/**
 * Filters out common development-mode warnings that are safe to ignore
 */
export function shouldIgnoreError(error: unknown): boolean {
  if (isAbortError(error)) {
    return true;
  }

  if (error instanceof Error) {
    // Ignore Next.js dev overlay aria-hidden warnings
    if (error.message.includes('aria-hidden') && process.env.NODE_ENV === 'development') {
      return true;
    }

    // Ignore other common dev-mode warnings
    const ignoredMessages = [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ];

    return ignoredMessages.some((msg) => error.message.includes(msg));
  }

  return false;
}

/**
 * Wrapper for fetch requests that handles abort signals gracefully
 */
export async function fetchWithAbortHandler<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { onAbort?: () => void }
): Promise<T> {
  const { onAbort, ...fetchInit } = init || {};

  try {
    const response = await fetch(input, fetchInit);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      // Call optional abort handler
      onAbort?.();
      // Optionally log in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Request aborted:', input);
      }
      throw error; // Re-throw so calling code can handle
    }
    throw error;
  }
}

/**
 * Creates an AbortController with a timeout
 */
export function createAbortControllerWithTimeout(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Clean up timeout if signal is aborted early
  controller.signal.addEventListener('abort', () => clearTimeout(timeout));

  return controller;
}

