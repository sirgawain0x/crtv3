/**
 * Utility function for sending analytics/metrics data using navigator.sendBeacon
 * with improved error handling for ERR_NETWORK_IO_SUSPENDED scenarios.
 * 
 * This function only throws errors when sendBeacon explicitly fails to queue
 * the data (returns false), not when network errors occur after queuing.
 * 
 * @param url - The URL to send the beacon request to
 * @param data - The data to send (can be Blob, ArrayBuffer, FormData, or string)
 * @param options - Optional configuration
 * @returns true if the beacon was successfully queued, false otherwise
 * @throws Error only if sendBeacon explicitly returns false (failed to queue)
 */
export function sendBeaconSafely(
  url: string,
  data: Blob | ArrayBuffer | FormData | string,
  options?: {
    /**
     * If true, throws an error when sendBeacon returns false.
     * If false, only logs the error and returns false.
     * Default: false
     */
    throwOnFailure?: boolean;
    /**
     * Custom error message when sendBeacon fails to queue
     */
    errorMessage?: string;
  }
): boolean {
  // Check if sendBeacon is available
  if (typeof window === 'undefined' || !window.navigator?.sendBeacon) {
    const message = 'sendBeacon is not available in this environment';
    console.warn(message, { url, data });
    
    if (options?.throwOnFailure) {
      throw new Error(message);
    }
    return false;
  }

  try {
    // Attempt to queue the beacon request
    const success = window.navigator.sendBeacon(url, data);

    // Only throw an error if sendBeacon explicitly failed to queue the data.
    // Network errors like ERR_NETWORK_IO_SUSPENDED after queuing are
    // outside the direct control of sendBeacon's return value.
    if (success === false) {
      // Check for explicit 'false'
      const errorMessage = options?.errorMessage || 'Beacon request could not be queued by the browser.';
      console.error('Failed to queue beacon request for analytics.', { url, data });

      // You might still want to throw here if queuing is critical,
      // or just log the error.
      if (options?.throwOnFailure) {
        throw new Error(errorMessage);
      }
      
      return false;
    }

    // If success is true or undefined (sendBeacon not available),
    // we assume the best or gracefully handle its absence.
    // No explicit 'else' needed as the request might still be suspended later.
    return true;
  } catch (error) {
    // Handle any unexpected errors during the sendBeacon call
    console.error('Unexpected error while calling sendBeacon:', error, { url, data });
    
    if (options?.throwOnFailure) {
      throw error instanceof Error 
        ? error 
        : new Error('Unexpected error while calling sendBeacon');
    }
    
    return false;
  }
}

/**
 * Helper function to create FormData for sendBeacon from an object
 */
export function createBeaconFormData(data: Record<string, string | number | boolean>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  return formData;
}

/**
 * Helper function to create a JSON blob for sendBeacon
 */
export function createBeaconJSONBlob(data: Record<string, unknown>): Blob {
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

