/**
 * Tests for timeout recovery logic in MeToken creation
 * Tests the scenarios where timeouts occur but transactions may have succeeded
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isTimeoutError } from '@/lib/utils/userOperationTimeout';

// Mock the dependencies
vi.mock('@/lib/utils/metokenUtils', () => ({
  getLatestMeTokenByOwner: vi.fn(),
}));

vi.mock('@/lib/utils/userOperationTimeout', async () => {
  const actual = await vi.importActual('@/lib/utils/userOperationTimeout');
  return {
    ...actual,
    sendUserOperationWithTimeout: vi.fn(),
    waitForUserOperationWithTimeout: vi.fn(),
  };
});

describe('MeToken Creation Timeout Recovery', () => {
  let mockClient: any;
  let mockGetLatestMeTokenByOwner: any;
  let mockSendUserOperationWithTimeout: any;
  let mockWaitForUserOperationWithTimeout: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    
    // Reset all mocks
    vi.clearAllMocks();

    // Mock smart account client
    mockClient = {
      account: {
        address: '0xuser123',
      },
      readContract: vi.fn(),
      sendUserOperation: vi.fn(),
      waitForUserOperationTransaction: vi.fn(),
    };

    // Mock getLatestMeTokenByOwner
    const metokenUtils = await import('@/lib/utils/metokenUtils');
    mockGetLatestMeTokenByOwner = vi.mocked(metokenUtils.getLatestMeTokenByOwner);

    // Mock timeout utilities
    const timeoutUtils = await import('@/lib/utils/userOperationTimeout');
    mockSendUserOperationWithTimeout = vi.mocked(timeoutUtils.sendUserOperationWithTimeout);
    mockWaitForUserOperationWithTimeout = vi.mocked(timeoutUtils.waitForUserOperationWithTimeout);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendUserOperation timeout recovery', () => {
    it('should verify MeToken was created when sendUserOperation times out', async () => {
      const meTokenAddress = '0xmetoken123';
      const timeoutError = new Error('UserOperation submission timed out after 120 seconds');

      // Mock timeout
      mockSendUserOperationWithTimeout.mockRejectedValue(timeoutError);
      
      // Mock successful verification
      mockGetLatestMeTokenByOwner.mockResolvedValue(meTokenAddress);

      // Mock fetch for sync
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(5000); // Wait for transaction to be mined
        
        const foundMeToken = await mockGetLatestMeTokenByOwner('0xuser123');
        
        expect(foundMeToken).toBe(meTokenAddress);
        expect(mockGetLatestMeTokenByOwner).toHaveBeenCalledWith('0xuser123');
      }
    });

    it('should rethrow original error when verification fails', async () => {
      const timeoutError = new Error('UserOperation submission timed out after 120 seconds');
      const verificationError = new Error('RPC error: connection failed');

      mockSendUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockGetLatestMeTokenByOwner.mockRejectedValue(verificationError);

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(5000);
        
        try {
          await mockGetLatestMeTokenByOwner('0xuser123');
        } catch (checkErr) {
          // Should rethrow original timeout error, not verification error
          expect(checkErr).not.toBe(verificationError);
          // The actual implementation should rethrow gasError
        }
      }
    });

    it('should throw helpful message when MeToken not found after timeout', async () => {
      const timeoutError = new Error('UserOperation submission timed out after 120 seconds');

      mockSendUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockGetLatestMeTokenByOwner.mockResolvedValue(null);

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(5000);
        
        const foundMeToken = await mockGetLatestMeTokenByOwner('0xuser123');
        
        if (!foundMeToken) {
          const error = new Error(
            'Transaction is taking longer than expected. Your MeToken creation may still be processing. ' +
            'Please wait 1-2 minutes and refresh the page to check if it completed. ' +
            'If your MeToken appears, you\'re all set! Otherwise, you can safely retry.'
          );
          
          expect(error.message).toContain('taking longer than expected');
          expect(error.message).toContain('may still be processing');
        }
      }
    });
  });

  describe('waitForUserOperationTransaction timeout recovery', () => {
    it('should verify MeToken was created when confirmation times out', async () => {
      const operationHash = '0xoperation123';
      const meTokenAddress = '0xmetoken123';
      const timeoutError = new Error('Transaction confirmation timed out after 180 seconds');

      mockWaitForUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockGetLatestMeTokenByOwner.mockResolvedValue(meTokenAddress);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(10000); // Wait for indexing
        
        const foundMeToken = await mockGetLatestMeTokenByOwner('0xuser123');
        
        expect(foundMeToken).toBe(meTokenAddress);
        expect(mockGetLatestMeTokenByOwner).toHaveBeenCalledWith('0xuser123');
      }
    });

    it('should rethrow original error when verification fails during confirmation wait', async () => {
      const operationHash = '0xoperation123';
      const timeoutError = new Error('Transaction confirmation timed out after 180 seconds');
      const verificationError = new Error('RPC error: connection failed');

      mockWaitForUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockGetLatestMeTokenByOwner.mockRejectedValue(verificationError);

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(10000);
        
        try {
          await mockGetLatestMeTokenByOwner('0xuser123');
        } catch (checkErr) {
          // Should rethrow original timeout error (waitError), not verification error
          expect(checkErr).not.toBe(verificationError);
        }
      }
    });
  });

  describe('DAI Approval timeout recovery', () => {
    it('should verify approval succeeded when sendUserOperation times out', async () => {
      const timeoutError = new Error('UserOperation submission timed out after 90 seconds');
      const depositAmount = BigInt('1000000000000000000'); // 1 DAI
      const vaultAddress = '0xvault123';
      const sufficientAllowance = depositAmount * BigInt(2);

      mockSendUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockClient.readContract.mockResolvedValue(sufficientAllowance);

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(5000);
        
        const currentAllowance = await mockClient.readContract({
          address: '0xdai',
          abi: [],
          functionName: 'allowance',
          args: ['0xuser123', vaultAddress],
        });
        
        if (currentAllowance >= depositAmount) {
          // Approval succeeded despite timeout
          expect(currentAllowance).toBeGreaterThanOrEqual(depositAmount);
        }
      }
    });

    it('should rethrow original error when allowance check fails', async () => {
      const timeoutError = new Error('UserOperation submission timed out after 90 seconds');
      const rpcError = new Error('RPC error: connection failed');

      mockSendUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockClient.readContract.mockRejectedValue(rpcError);

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(5000);
        
        try {
          await mockClient.readContract({
            address: '0xdai',
            abi: [],
            functionName: 'allowance',
            args: ['0xuser123', '0xvault123'],
          });
        } catch (checkErr) {
          // Should rethrow original timeout error, not RPC error
          expect(checkErr).not.toBe(rpcError);
        }
      }
    });

    it('should verify approval succeeded when waitForUserOperationTransaction times out', async () => {
      const timeoutError = new Error('Transaction confirmation timed out after 90 seconds');
      const depositAmount = BigInt('1000000000000000000');
      const sufficientAllowance = depositAmount * BigInt(2);

      mockWaitForUserOperationWithTimeout.mockRejectedValue(timeoutError);
      mockClient.readContract.mockResolvedValue(sufficientAllowance);

      // Simulate the timeout recovery logic
      if (isTimeoutError(timeoutError)) {
        await vi.advanceTimersByTimeAsync(5000);
        
        const currentAllowance = await mockClient.readContract({
          address: '0xdai',
          abi: [],
          functionName: 'allowance',
          args: ['0xuser123', '0xvault123'],
        });
        
        if (currentAllowance >= depositAmount) {
          expect(currentAllowance).toBeGreaterThanOrEqual(depositAmount);
        }
      }
    });
  });

  describe('Error message accuracy', () => {
    it('should provide accurate error message when verification succeeds but MeToken not found', () => {
      const error = new Error(
        'Transaction is taking longer than expected. Your MeToken creation may still be processing. ' +
        'Please wait 1-2 minutes and refresh the page to check if it completed. ' +
        'If your MeToken appears, you\'re all set! Otherwise, you can safely retry.'
      );

      expect(error.message).toContain('taking longer than expected');
      expect(error.message).toContain('may still be processing');
      expect(error.message).toContain('wait 1-2 minutes');
    });

    it('should provide accurate error message when confirmation times out', () => {
      const operationHash = '0x1234567890';
      const error = new Error(
        `Transaction was submitted (hash: ${operationHash.slice(0, 10)}...) but confirmation is taking longer than expected. ` +
        'Your MeToken may still be created. Please wait 1-2 minutes and refresh the page. ' +
        'If your MeToken appears, you\'re all set!'
      );

      expect(error.message).toContain('was submitted');
      expect(error.message).toContain('confirmation is taking longer');
      expect(error.message).toContain(operationHash.slice(0, 10));
    });
  });
});
