import { OrbisError, OrbisErrorType } from './types';

/**
 * Maps error messages to user-friendly descriptions
 */
const ERROR_MESSAGES = {
  [OrbisErrorType.AUTH_ERROR]:
    'Authentication failed. Please try logging in again.',
  [OrbisErrorType.VALIDATION_ERROR]: 'The provided data is invalid.',
  [OrbisErrorType.NETWORK_ERROR]:
    'Network error. Please check your connection.',
  [OrbisErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [OrbisErrorType.FORBIDDEN]:
    'You do not have permission to perform this action.',
  [OrbisErrorType.UNKNOWN]: 'An unexpected error occurred.',
} as const;

/**
 * Determines the type of error based on the error message or instance
 */
function determineErrorType(error: unknown): OrbisErrorType {
  if (error instanceof OrbisError) {
    return error.type;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('not authenticated')
  ) {
    return OrbisErrorType.AUTH_ERROR;
  }
  if (errorMessage.includes('validation')) {
    return OrbisErrorType.VALIDATION_ERROR;
  }
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return OrbisErrorType.NETWORK_ERROR;
  }
  if (errorMessage.includes('not found')) {
    return OrbisErrorType.NOT_FOUND;
  }
  if (
    errorMessage.includes('forbidden') ||
    errorMessage.includes('permission')
  ) {
    return OrbisErrorType.FORBIDDEN;
  }

  return OrbisErrorType.UNKNOWN;
}

/**
 * Creates a user-friendly error message based on the error type
 */
function createUserFriendlyMessage(
  type: OrbisErrorType,
  originalMessage?: string,
): string {
  const baseMessage = ERROR_MESSAGES[type];
  return originalMessage
    ? `${baseMessage} Details: ${originalMessage}`
    : baseMessage;
}

/**
 * Handles errors from OrbisDB operations
 * @param error - The error to handle
 * @param context - Additional context about where the error occurred
 * @returns A standardized OrbisError instance
 */
export function handleOrbisError(error: unknown, context?: string): OrbisError {
  const errorType = determineErrorType(error);
  const originalMessage =
    error instanceof Error ? error.message : String(error);
  const userMessage = createUserFriendlyMessage(errorType, originalMessage);

  const errorDetails = {
    context,
    originalError: error,
    timestamp: new Date().toISOString(),
  };

  // Log error for debugging
  console.error('OrbisDB Error:', {
    type: errorType,
    message: userMessage,
    details: errorDetails,
  });

  return new OrbisError(userMessage, errorType, errorDetails);
}

/**
 * Safely executes an OrbisDB operation and handles any errors
 * @param operation - The async operation to execute
 * @param context - Context information about the operation
 * @returns The operation result or throws a handled error
 */
export async function executeOrbisOperation<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handleOrbisError(error, context);
  }
}
