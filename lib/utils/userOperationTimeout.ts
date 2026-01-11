/**
 * UserOperation Timeout Utilities
 * 
 * Provides robust timeout handling for ERC-4337 UserOperations
 * which typically take longer than regular transactions due to bundler processing.
 */

import { parseBundlerError } from './bundlerErrorParser';

export interface UserOperationTimeoutOptions {
  /** Timeout for sendUserOperation in milliseconds (default: 120000 = 2 minutes) */
  sendTimeout?: number;
  /** Timeout for waitForUserOperationTransaction in milliseconds (default: 180000 = 3 minutes) */
  waitTimeout?: number;
  /** Optional callback for progress updates */
  onProgress?: (stage: TransactionStage, message: string) => void;
}

export type TransactionStage = 
  | 'preparing'
  | 'sending'
  | 'sent'
  | 'waiting'
  | 'confirmed'
  | 'timeout'
  | 'error';

export interface UserOperationResult {
  hash: string;
  txHash?: string;
  stage: TransactionStage;
  error?: Error;
}

const DEFAULT_SEND_TIMEOUT = 120000; // 2 minutes
const DEFAULT_WAIT_TIMEOUT = 180000; // 3 minutes

/**
 * Creates a promise that rejects after the specified timeout
 */
function createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Wraps sendUserOperation with a timeout
 */
export async function sendUserOperationWithTimeout<T extends { hash: string }>(
  sendFn: () => Promise<T>,
  options: UserOperationTimeoutOptions = {}
): Promise<T> {
  const timeout = options.sendTimeout ?? DEFAULT_SEND_TIMEOUT;
  const timeoutSeconds = Math.round(timeout / 1000);
  
  options.onProgress?.('sending', 'Submitting transaction to the network...');
  
  const timeoutPromise = createTimeoutPromise<T>(
    timeout,
    `UserOperation submission timed out after ${timeoutSeconds} seconds. The transaction may still be processing in the background. Please wait a moment and check if your action completed before retrying.`
  );
  
  try {
    const result = await Promise.race([sendFn(), timeoutPromise]);
    options.onProgress?.('sent', `Transaction submitted! Hash: ${result.hash.slice(0, 10)}...`);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      options.onProgress?.('timeout', 'Transaction submission timed out');
    } else {
      options.onProgress?.('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * Wraps waitForUserOperationTransaction with a timeout
 */
export async function waitForUserOperationWithTimeout(
  waitFn: () => Promise<string>,
  operationHash: string,
  options: UserOperationTimeoutOptions = {}
): Promise<string> {
  const timeout = options.waitTimeout ?? DEFAULT_WAIT_TIMEOUT;
  const timeoutSeconds = Math.round(timeout / 1000);
  
  options.onProgress?.('waiting', 'Waiting for transaction confirmation...');
  
  const timeoutPromise = createTimeoutPromise<string>(
    timeout,
    `Transaction confirmation timed out after ${timeoutSeconds} seconds. Your transaction (${operationHash.slice(0, 10)}...) was submitted and may still confirm. Please check your transaction history before retrying.`
  );
  
  try {
    const txHash = await Promise.race([waitFn(), timeoutPromise]);
    options.onProgress?.('confirmed', `Transaction confirmed! Hash: ${txHash.slice(0, 10)}...`);
    return txHash;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      options.onProgress?.('timeout', 'Transaction confirmation timed out (may still complete)');
    } else {
      options.onProgress?.('error', `Confirmation error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
    throw error;
  }
}

/**
 * Full flow: send and wait with proper timeout handling
 */
export async function executeUserOperationWithTimeout<T extends { hash: string }>(
  client: {
    sendUserOperation: (params: unknown) => Promise<T>;
    waitForUserOperationTransaction: (params: { hash: string }) => Promise<string>;
  },
  operationParams: unknown,
  options: UserOperationTimeoutOptions = {}
): Promise<{ operationHash: string; txHash: string }> {
  // Step 1: Send the operation
  const operation = await sendUserOperationWithTimeout(
    () => client.sendUserOperation(operationParams) as Promise<T>,
    options
  );
  
  // Step 2: Wait for confirmation
  const txHash = await waitForUserOperationWithTimeout(
    () => client.waitForUserOperationTransaction({ hash: operation.hash }),
    operation.hash,
    options
  );
  
  return { operationHash: operation.hash, txHash };
}

/**
 * Determines if an error is a timeout error that might still result in a successful transaction
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('timed out') ||
      error.message.includes('timeout') ||
      error.message.includes('Timeout')
    );
  }
  return false;
}

/**
 * Determines if we should check for transaction completion despite timeout
 */
export function shouldVerifyTransactionAfterTimeout(error: unknown): boolean {
  if (!isTimeoutError(error)) return false;
  
  // If the error message indicates the operation was submitted, we should verify
  if (error instanceof Error) {
    return (
      error.message.includes('was submitted') ||
      error.message.includes('may still') ||
      error.message.includes('confirmation timed out')
    );
  }
  return false;
}

/**
 * Analyzes a transaction error and provides actionable advice
 */
export function analyzeTransactionError(error: Error): {
  isTimeout: boolean;
  isRetryable: boolean;
  userMessage: string;
  suggestion: string;
} {
  const isTimeout = isTimeoutError(error);
  
  if (isTimeout) {
    return {
      isTimeout: true,
      isRetryable: false, // Don't auto-retry timeouts to avoid duplicates
      userMessage: 'Transaction is taking longer than expected.',
      suggestion: 'Please wait a moment and check if your MeToken was created. If not, you can safely retry.',
    };
  }
  
  // Use existing bundler error parser for other errors
  const parsed = parseBundlerError(error);
  
  return {
    isTimeout: false,
    isRetryable: parsed.shouldRetry,
    userMessage: parsed.message,
    suggestion: parsed.suggestion,
  };
}

/**
 * Creates a progress tracker for long-running operations
 */
export function createProgressTracker(
  onUpdate: (message: string, percentage: number) => void
): {
  update: (stage: TransactionStage, message: string) => void;
  complete: () => void;
  error: (message: string) => void;
} {
  const stagePercentages: Record<TransactionStage, number> = {
    preparing: 10,
    sending: 30,
    sent: 50,
    waiting: 70,
    confirmed: 100,
    timeout: 80,
    error: 0,
  };
  
  return {
    update: (stage, message) => {
      onUpdate(message, stagePercentages[stage]);
    },
    complete: () => {
      onUpdate('Transaction completed successfully!', 100);
    },
    error: (message) => {
      onUpdate(message, 0);
    },
  };
}
