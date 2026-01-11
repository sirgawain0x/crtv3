/**
 * Tests for userOperationTimeout.ts
 * Tests timeout handling for ERC-4337 UserOperations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  sendUserOperationWithTimeout,
  waitForUserOperationWithTimeout,
  isTimeoutError,
  shouldVerifyTransactionAfterTimeout,
  analyzeTransactionError,
  createProgressTracker,
  executeUserOperationWithTimeout,
} from '../userOperationTimeout';

describe('userOperationTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('sendUserOperationWithTimeout', () => {
    it('should return result when operation completes before timeout', async () => {
      const mockOperation = { hash: '0x123' };
      const sendFn = vi.fn().mockResolvedValue(mockOperation);

      const promise = sendUserOperationWithTimeout(sendFn, {
        sendTimeout: 1000,
      });

      // Fast-forward time but not past timeout
      await vi.advanceTimersByTimeAsync(500);
      
      const result = await promise;
      
      expect(result).toEqual(mockOperation);
      expect(sendFn).toHaveBeenCalledTimes(1);
    });

    it('should throw timeout error when operation exceeds timeout', async () => {
      const mockOperation = { hash: '0x123' };
      const sendFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockOperation), 2000))
      );

      const promise = sendUserOperationWithTimeout(sendFn, {
        sendTimeout: 1000,
      });

      // Fast-forward past timeout
      await vi.advanceTimersByTimeAsync(1000);

      try {
        await promise;
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out');
        expect(sendFn).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onProgress callback with correct stages', async () => {
      const mockOperation = { hash: '0x123' };
      const sendFn = vi.fn().mockResolvedValue(mockOperation);
      const onProgress = vi.fn();

      const promise = sendUserOperationWithTimeout(sendFn, {
        sendTimeout: 1000,
        onProgress,
      });

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(onProgress).toHaveBeenCalledWith('sending', 'Submitting transaction to the network...');
      expect(onProgress).toHaveBeenCalledWith('sent', expect.stringContaining('Transaction submitted!'));
    });

    it('should call onProgress with timeout stage on timeout', async () => {
      const sendFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ hash: '0x123' }), 2000))
      );
      const onProgress = vi.fn();

      const promise = sendUserOperationWithTimeout(sendFn, {
        sendTimeout: 1000,
        onProgress,
      });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();
      expect(onProgress).toHaveBeenCalledWith('timeout', 'Transaction submission timed out');
    });
  });

  describe('waitForUserOperationWithTimeout', () => {
    it('should return txHash when confirmation completes before timeout', async () => {
      const mockTxHash = '0xtxhash';
      const waitFn = vi.fn().mockResolvedValue(mockTxHash);

      const promise = waitForUserOperationWithTimeout(
        waitFn,
        '0xoperation',
        { waitTimeout: 1000 }
      );

      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;

      expect(result).toBe(mockTxHash);
      expect(waitFn).toHaveBeenCalledTimes(1);
    });

    it('should throw timeout error when confirmation exceeds timeout', async () => {
      const mockTxHash = '0xtxhash';
      const waitFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTxHash), 2000))
      );

      const promise = waitForUserOperationWithTimeout(
        waitFn,
        '0xoperation',
        { waitTimeout: 1000 }
      );

      await vi.advanceTimersByTimeAsync(1000);

      try {
        await promise;
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out');
        expect(waitFn).toHaveBeenCalledTimes(1);
      }
    });

    it('should include operation hash in timeout error message', async () => {
      const waitFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('0xtxhash'), 2000))
      );

      const promise = waitForUserOperationWithTimeout(
        waitFn,
        '0x1234567890',
        { waitTimeout: 1000 }
      );

      await vi.advanceTimersByTimeAsync(1000);

      try {
        await promise;
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('0x12345678');
      }
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for timeout errors', () => {
      expect(isTimeoutError(new Error('timed out after 60 seconds'))).toBe(true);
      expect(isTimeoutError(new Error('Transaction timeout'))).toBe(true);
      expect(isTimeoutError(new Error('Timeout occurred'))).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      expect(isTimeoutError(new Error('Transaction failed'))).toBe(false);
      expect(isTimeoutError(new Error('Insufficient funds'))).toBe(false);
      expect(isTimeoutError('string error')).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
    });
  });

  describe('shouldVerifyTransactionAfterTimeout', () => {
    it('should return true for timeout errors that indicate submission', () => {
      // Must be a timeout error first, then check for submission indicators
      expect(
        shouldVerifyTransactionAfterTimeout(
          new Error('Transaction confirmation timed out after 180 seconds. Your transaction was submitted')
        )
      ).toBe(true);
      expect(
        shouldVerifyTransactionAfterTimeout(
          new Error('Transaction timed out and may still be processing')
        )
      ).toBe(true);
      expect(
        shouldVerifyTransactionAfterTimeout(
          new Error('Transaction confirmation timed out')
        )
      ).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      expect(
        shouldVerifyTransactionAfterTimeout(new Error('Transaction failed'))
      ).toBe(false);
    });

    it('should return false for timeout errors without submission indication', () => {
      expect(
        shouldVerifyTransactionAfterTimeout(new Error('timed out'))
      ).toBe(false);
    });
  });

  describe('analyzeTransactionError', () => {
    it('should analyze timeout errors correctly', () => {
      const error = new Error('Transaction timed out after 60 seconds');
      const analysis = analyzeTransactionError(error);

      expect(analysis.isTimeout).toBe(true);
      expect(analysis.isRetryable).toBe(false);
      expect(analysis.userMessage).toBe('Transaction is taking longer than expected.');
      expect(analysis.suggestion).toContain('check if your MeToken was created');
    });

    it('should analyze non-timeout errors using bundler parser', () => {
      // Mock parseBundlerError to return a known structure
      const error = new Error('Bundler error');
      const analysis = analyzeTransactionError(error);

      expect(analysis.isTimeout).toBe(false);
      // The actual values depend on parseBundlerError implementation
      expect(analysis).toHaveProperty('isRetryable');
      expect(analysis).toHaveProperty('userMessage');
      expect(analysis).toHaveProperty('suggestion');
    });
  });

  describe('createProgressTracker', () => {
    it('should track progress through stages', () => {
      const updates: Array<[string, number]> = [];
      const tracker = createProgressTracker((message, percentage) => {
        updates.push([message, percentage]);
      });

      tracker.update('preparing', 'Preparing transaction...');
      tracker.update('sending', 'Sending transaction...');
      tracker.update('sent', 'Transaction sent');
      tracker.complete();

      expect(updates).toEqual([
        ['Preparing transaction...', 10],
        ['Sending transaction...', 30],
        ['Transaction sent', 50],
        ['Transaction completed successfully!', 100],
      ]);
    });

    it('should handle error stage', () => {
      const updates: Array<[string, number]> = [];
      const tracker = createProgressTracker((message, percentage) => {
        updates.push([message, percentage]);
      });

      tracker.error('Transaction failed');

      expect(updates).toEqual([['Transaction failed', 0]]);
    });
  });

  describe('executeUserOperationWithTimeout', () => {
    it('should execute full flow: send and wait', async () => {
      const mockClient = {
        sendUserOperation: vi.fn().mockResolvedValue({ hash: '0xoperation' }),
        waitForUserOperationTransaction: vi.fn().mockResolvedValue('0xtxhash'),
      };

      const promise = executeUserOperationWithTimeout(
        mockClient as any,
        { uo: { target: '0xtarget', data: '0xdata' } },
        { sendTimeout: 1000, waitTimeout: 1000 }
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual({
        operationHash: '0xoperation',
        txHash: '0xtxhash',
      });
      expect(mockClient.sendUserOperation).toHaveBeenCalled();
      expect(mockClient.waitForUserOperationTransaction).toHaveBeenCalledWith({
        hash: '0xoperation',
      });
    });

    it('should handle timeout during sendUserOperation', async () => {
      const mockClient = {
        sendUserOperation: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ hash: '0xoperation' }), 2000))
        ),
        waitForUserOperationTransaction: vi.fn(),
      };

      const promise = executeUserOperationWithTimeout(
        mockClient as any,
        { uo: { target: '0xtarget', data: '0xdata' } },
        { sendTimeout: 1000, waitTimeout: 1000 }
      );

      await vi.advanceTimersByTimeAsync(1000);

      try {
        await promise;
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out');
        expect(mockClient.waitForUserOperationTransaction).not.toHaveBeenCalled();
      }
    });

    it('should handle timeout during waitForUserOperationTransaction', async () => {
      const mockClient = {
        sendUserOperation: vi.fn().mockResolvedValue({ hash: '0xoperation' }),
        waitForUserOperationTransaction: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('0xtxhash'), 2000))
        ),
      };

      const promise = executeUserOperationWithTimeout(
        mockClient as any,
        { uo: { target: '0xtarget', data: '0xdata' } },
        { sendTimeout: 1000, waitTimeout: 1000 }
      );

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      try {
        await promise;
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out');
        expect(mockClient.sendUserOperation).toHaveBeenCalled();
      }
    });
  });
});
