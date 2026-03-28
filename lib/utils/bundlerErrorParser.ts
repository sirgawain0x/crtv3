/**
 * Bundler Error Parser
 * Parses EntryPoint AAxx error codes and provides user-friendly messages
 */

export interface ParsedBundlerError {
  code?: string;
  message: string;
  suggestion: string;
  shouldRetry: boolean;
  retryDelay?: number;
}

/**
 * Parse bundler error and extract EntryPoint error codes
 */
export function parseBundlerError(error: Error): ParsedBundlerError {
  const errorMessage = error.message;
  
  // Extract AAxx code if present (e.g., "AA21", "AA23")
  const aaCodeMatch = errorMessage.match(/AA(\d{2})/);
  const code = aaCodeMatch ? `AA${aaCodeMatch[1]}` : undefined;
  
  // Error code definitions from bundler rules
  const errorDefinitions: Record<string, { message: string; suggestion: string; retryable: boolean }> = {
    // Account creation errors (AA1x)
    'AA10': {
      message: 'Account already exists',
      suggestion: 'Remove initCode if re-submitting for an existing account.',
      retryable: false,
    },
    'AA13': {
      message: 'Account creation failed or ran out of gas',
      suggestion: 'Ensure account has sufficient native token for deployment, or increase verificationGasLimit.',
      retryable: true,
    },
    'AA14': {
      message: 'Account creation returned wrong address',
      suggestion: 'Verify factory contract returns the correct sender address.',
      retryable: false,
    },
    'AA15': {
      message: 'Account creation did not deploy contract',
      suggestion: 'Verify initCode actually deploys a contract at the sender address.',
      retryable: false,
    },
    'AA20': {
      message: 'Account not deployed and no initCode provided',
      suggestion: 'Include initCode for first transaction, or use correct sender address.',
      retryable: false,
    },
    
    // Sender/UserOp errors (AA2x)
    'AA21': {
      message: 'Insufficient native token for prefund',
      suggestion: 'Ensure your smart account has enough ETH for gas fees, or use a paymaster.',
      retryable: true,
    },
    'AA22': {
      message: 'UserOp expired or not yet valid',
      suggestion: 'Check validAfter and validUntil timestamps are correct.',
      retryable: false,
    },
    'AA23': {
      message: 'Account validation reverted',
      suggestion: 'Investigate validateUserOp logic using tools like Tenderly. Check verificationGasLimit is sufficient.',
      retryable: true,
    },
    'AA24': {
      message: 'Invalid signature',
      suggestion: 'Verify you\'re using the correct private key, entryPoint address, and chainId.',
      retryable: false,
    },
    'AA25': {
      message: 'Invalid account nonce',
      suggestion: 'Fetch current nonce from EntryPoint before submitting UserOp. Nonce may be out of sync.',
      retryable: true,
    },
    'AA26': {
      message: 'Verification gas limit exceeded',
      suggestion: 'Increase verificationGasLimit in your UserOp to cover validation complexity.',
      retryable: true,
    },
    
    // Paymaster errors (AA3x)
    'AA30': {
      message: 'Paymaster not deployed',
      suggestion: 'Verify paymaster contract address is correct and deployed on this network.',
      retryable: false,
    },
    'AA31': {
      message: 'Paymaster deposit too low',
      suggestion: 'Paymaster needs more funds deposited into EntryPoint.',
      retryable: false,
    },
    'AA32': {
      message: 'Paymaster expired or not yet valid',
      suggestion: 'Check paymaster validity window and submit within allowed timeframe.',
      retryable: false,
    },
    'AA33': {
      message: 'Paymaster validation reverted',
      suggestion: 'Investigate validatePaymasterUserOp logic. Check verificationGasLimit is sufficient.',
      retryable: true,
    },
    'AA34': {
      message: 'Paymaster signature error',
      suggestion: 'Verify paymaster signature format and authorization mechanism.',
      retryable: false,
    },
    'AA36': {
      message: 'Paymaster verification gas limit exceeded',
      suggestion: 'Increase paymasterVerificationGasLimit.',
      retryable: true,
    },
    
    // Verification errors (AA4x - v0.6 only)
    'AA40': {
      message: 'Verification gas limit exceeded',
      suggestion: 'Increase verificationGasLimit to cover smart account and paymaster verification.',
      retryable: true,
    },
    'AA41': {
      message: 'Too little verification gas',
      suggestion: 'Increase verificationGasLimit.',
      retryable: true,
    },
    
    // Post-execution errors (AA5x - v0.6 only)
    'AA50': {
      message: 'Paymaster postOp reverted',
      suggestion: 'Contact paymaster provider or Alchemy support.',
      retryable: false,
    },
    'AA51': {
      message: 'Prefund below actual gas cost',
      suggestion: 'Actual gas cost exceeded prefund. This is a bundler issue.',
      retryable: false,
    },
    
    // General errors (AA9x)
    'AA90': {
      message: 'Invalid beneficiary address',
      suggestion: 'Bundler configuration issue. Contact Alchemy support.',
      retryable: false,
    },
    'AA91': {
      message: 'Failed to send fees to beneficiary',
      suggestion: 'Bundler configuration issue. Contact Alchemy support.',
      retryable: false,
    },
    'AA92': {
      message: 'Internal call only',
      suggestion: 'Do not call EntryPoint internal methods directly.',
      retryable: false,
    },
    'AA93': {
      message: 'Invalid paymasterAndData format',
      suggestion: 'Ensure paymasterAndData is either empty or at least 20 bytes long.',
      retryable: false,
    },
    'AA94': {
      message: 'Gas values overflow',
      suggestion: 'Reduce gas limit values to fit within 120-bit range.',
      retryable: false,
    },
    'AA95': {
      message: 'Out of gas',
      suggestion: 'Increase gas limits provided to bundler or optimize contract calls.',
      retryable: true,
    },
    'AA96': {
      message: 'Invalid aggregator address',
      suggestion: 'Use proper aggregator address implementing IAggregator interface.',
      retryable: false,
    },
  };
  
  // Check for common error patterns
  const isAllowanceError = errorMessage.toLowerCase().includes('insufficient allowance') ||
                          errorMessage.toLowerCase().includes('erc20') ||
                          errorMessage.toLowerCase().includes('allowance');
  
  const isGasEstimationError = errorMessage.toLowerCase().includes('gas') ||
                               errorMessage.toLowerCase().includes('estimation') ||
                               errorMessage.toLowerCase().includes('simulation');
  
  const isStateSyncError = errorMessage.toLowerCase().includes('state') ||
                          errorMessage.toLowerCase().includes('propagation') ||
                          errorMessage.toLowerCase().includes('sync');
  
  // If we have a specific error code, use its definition
  if (code && errorDefinitions[code]) {
    const def = errorDefinitions[code];
    return {
      code,
      message: def.message,
      suggestion: def.suggestion,
      shouldRetry: def.retryable,
      retryDelay: def.retryable ? 10000 : undefined, // 10s default for retryable
    };
  }
  
  // Handle common patterns without specific codes
  if (isAllowanceError) {
    return {
      message: 'Insufficient allowance',
      suggestion: 'The bundler may not see the allowance yet. Wait a few seconds and retry, or use separate approve + mint transactions.',
      shouldRetry: true,
      retryDelay: 15000, // 15s for state propagation
    };
  }
  
  if (isGasEstimationError) {
    return {
      message: 'Gas estimation failed',
      suggestion: 'Gas estimation may have failed due to state simulation issues. Try again or use separate transactions.',
      shouldRetry: true,
      retryDelay: 5000, // 5s for temporary issues
    };
  }
  
  if (isStateSyncError) {
    return {
      message: 'State synchronization issue',
      suggestion: 'The bundler may not have synced state yet. Wait a few seconds and retry.',
      shouldRetry: true,
      retryDelay: 10000, // 10s for state sync
    };
  }
  
  // Generic error
  return {
    message: errorMessage,
    suggestion: 'Check the error message for details. If the issue persists, try refreshing the page or contact support.',
    shouldRetry: false,
  };
}

/**
 * Determine if an error should be retried and with what delay
 */
export function shouldRetryError(
  error: Error,
  attempt: number,
  maxAttempts: number
): { shouldRetry: boolean; delay: number } {
  const parsed = parseBundlerError(error);
  
  if (!parsed.shouldRetry || attempt >= maxAttempts) {
    return { shouldRetry: false, delay: 0 };
  }
  
  // Use exponential backoff with the suggested delay as base
  const baseDelay = parsed.retryDelay || 10000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 60000); // Max 60s
  
  return { shouldRetry: true, delay };
}

