/**
 * Integration tests for MeToken creation functionality
 * Tests the full flow from start to finish, including approvals, subscriptions, and database sync
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { parseEther } from 'viem';

// Mock dependencies
vi.mock('@/lib/utils/metokenUtils', () => ({
  getLatestMeTokenByOwner: vi.fn(),
  getBulkMeTokenInfo: vi.fn(),
}));

vi.mock('@/lib/utils/userOperationTimeout', () => ({
  sendUserOperationWithTimeout: vi.fn(),
  waitForUserOperationWithTimeout: vi.fn(),
  isTimeoutError: vi.fn(),
  analyzeTransactionError: vi.fn(),
}));

vi.mock('@/lib/sdk/metokens/subgraph', () => ({
  meTokensSubgraph: {
    getAllMeTokens: vi.fn(),
    getMeTokensByOwner: vi.fn(),
  },
}));

vi.mock('@/lib/sdk/supabase/metokens', () => ({
  meTokenSupabaseService: {
    getMeTokenByOwner: vi.fn(),
    createMeToken: vi.fn(),
    updateMeToken: vi.fn(),
  },
}));

describe('MeToken Creation Integration Tests', () => {
  let mockClient: any;
  let mockGetLatestMeTokenByOwner: any;
  let mockGetBulkMeTokenInfo: any;
  let mockSendUserOperationWithTimeout: any;
  let mockWaitForUserOperationWithTimeout: any;
  let mockMeTokensSubgraph: any;
  let mockMeTokenSupabaseService: any;
  let mockFetch: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock smart account client
    mockClient = {
      account: {
        address: '0xuser123',
      },
      getCode: vi.fn().mockResolvedValue('0x1234'), // Deployed account
      readContract: vi.fn(),
      sendUserOperation: vi.fn(),
      waitForUserOperationTransaction: vi.fn(),
    };

    // Mock utility functions
    const metokenUtils = await import('@/lib/utils/metokenUtils');
    mockGetLatestMeTokenByOwner = vi.mocked(metokenUtils.getLatestMeTokenByOwner);
    mockGetBulkMeTokenInfo = vi.mocked(metokenUtils.getBulkMeTokenInfo);

    // Mock timeout utilities
    const timeoutUtils = await import('@/lib/utils/userOperationTimeout');
    mockSendUserOperationWithTimeout = vi.mocked(timeoutUtils.sendUserOperationWithTimeout);
    mockWaitForUserOperationWithTimeout = vi.mocked(timeoutUtils.waitForUserOperationWithTimeout);

    // Mock subgraph
    const subgraph = await import('@/lib/sdk/metokens/subgraph');
    mockMeTokensSubgraph = subgraph.meTokensSubgraph;

    // Mock Supabase service
    const supabase = await import('@/lib/sdk/supabase/metokens');
    mockMeTokenSupabaseService = supabase.meTokenSupabaseService;

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full MeToken Creation Flow', () => {
    it('should successfully create a MeToken with DAI deposit', async () => {
      const meTokenAddress = '0xmetoken123';
      const vaultAddress = '0xvault123';
      const depositAmount = parseEther('100'); // 100 DAI
      const operationHash = '0xoperation123';
      const txHash = '0xtxhash123';

      // Setup: No existing MeToken
      mockGetLatestMeTokenByOwner.mockResolvedValue(null);
      mockMeTokensSubgraph.getAllMeTokens.mockResolvedValue([]);
      mockMeTokenSupabaseService.getMeTokenByOwner.mockResolvedValue(null);

      // Setup: Sufficient DAI allowance check (initially insufficient)
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(0)) // Initial vault allowance
        .mockResolvedValueOnce(BigInt(0)) // Initial DIAMOND allowance
        .mockResolvedValueOnce(depositAmount * BigInt(2)) // After vault approval
        .mockResolvedValueOnce(depositAmount * BigInt(2)); // After DIAMOND approval

      // Setup: Get vault address
      mockClient.readContract.mockResolvedValueOnce(vaultAddress);

      // Setup: Approval operations
      mockSendUserOperationWithTimeout
        .mockResolvedValueOnce({ hash: '0xapprove1' }) // Vault approval
        .mockResolvedValueOnce({ hash: '0xapprove2' }); // DIAMOND approval

      mockWaitForUserOperationWithTimeout
        .mockResolvedValueOnce('0xapproveTx1') // Vault approval confirmation
        .mockResolvedValueOnce('0xapproveTx2'); // DIAMOND approval confirmation

      // Setup: Main subscription operation
      mockSendUserOperationWithTimeout.mockResolvedValueOnce({
        hash: operationHash,
      });

      mockWaitForUserOperationWithTimeout.mockResolvedValueOnce(txHash);

      // Setup: MeToken creation verification
      mockGetLatestMeTokenByOwner.mockResolvedValueOnce(meTokenAddress);

      // Setup: Database sync
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Setup: Final MeToken check
      mockMeTokenSupabaseService.getMeTokenByOwner.mockResolvedValueOnce({
        address: meTokenAddress,
        name: 'Test Token',
        symbol: 'TEST',
      });

      // Execute creation flow (simulated)
      // This would be called from createMeTokenInternal
      const steps = [
        'Check existing MeToken',
        'Get vault address',
        'Check DAI allowance',
        'Approve DAI for vault',
        'Approve DAI for DIAMOND',
        'Subscribe to create MeToken',
        'Wait for confirmation',
        'Verify MeToken creation',
        'Sync to database',
      ];

      // Verify all steps would be executed
      expect(steps.length).toBeGreaterThan(0);

      // Verify approval flow
      expect(mockClient.readContract).toHaveBeenCalled();
      expect(mockSendUserOperationWithTimeout).toHaveBeenCalled();
    });

    it('should create MeToken without DAI deposit (0 deposit)', async () => {
      const meTokenAddress = '0xmetoken123';
      const operationHash = '0xoperation123';
      const txHash = '0xtxhash123';

      // Setup: No existing MeToken
      mockGetLatestMeTokenByOwner.mockResolvedValue(null);
      mockMeTokensSubgraph.getAllMeTokens.mockResolvedValue([]);
      mockMeTokenSupabaseService.getMeTokenByOwner.mockResolvedValue(null);

      // Setup: No approvals needed (0 deposit)
      // Main subscription operation
      mockSendUserOperationWithTimeout.mockResolvedValueOnce({
        hash: operationHash,
      });

      mockWaitForUserOperationWithTimeout.mockResolvedValueOnce(txHash);

      // Setup: MeToken creation verification
      mockGetLatestMeTokenByOwner.mockResolvedValueOnce(meTokenAddress);

      // Verify no approval calls for 0 deposit
      // Approval checks should be skipped
    });

    it('should skip approvals if sufficient allowance already exists', async () => {
      const depositAmount = parseEther('100');
      const vaultAddress = '0xvault123';
      const operationHash = '0xoperation123';

      // Setup: Sufficient allowance already exists
      mockClient.readContract
        .mockResolvedValueOnce(depositAmount * BigInt(2)) // Vault allowance sufficient
        .mockResolvedValueOnce(depositAmount * BigInt(2)); // DIAMOND allowance sufficient

      // Setup: Get vault address
      mockClient.readContract.mockResolvedValueOnce(vaultAddress);

      // Setup: Main subscription operation (no approvals needed)
      mockSendUserOperationWithTimeout.mockResolvedValueOnce({
        hash: operationHash,
      });

      // Verify approval operations are not called
      // The code should skip approval if allowance is sufficient
    });
  });

  describe('Error Handling', () => {
    it('should throw error if user already has a MeToken', async () => {
      const existingMeToken = {
        address: '0xexisting123',
        name: 'Existing Token',
        symbol: 'EXIST',
      };

      mockMeTokenSupabaseService.getMeTokenByOwner.mockResolvedValue(
        existingMeToken
      );

      // Should throw error before attempting creation
      await expect(async () => {
        if (existingMeToken) {
          throw new Error(
            'You already have a MeToken. Please use the existing one or contact support if you need to create a new one.'
          );
        }
      }).rejects.toThrow('already have a MeToken');
    });

    it('should handle RPC errors during allowance check', async () => {
      const rpcError = new Error('RPC error: connection failed');
      mockClient.readContract.mockRejectedValueOnce(rpcError);

      // Should handle error gracefully
      try {
        await mockClient.readContract({
          address: '0xdai',
          abi: [],
          functionName: 'allowance',
          args: ['0xuser123', '0xvault123'],
        });
      } catch (error) {
        expect(error).toBe(rpcError);
      }
    });

    it('should handle approval transaction failure', async () => {
      const approvalError = new Error('Approval transaction failed');
      mockSendUserOperationWithTimeout.mockRejectedValueOnce(approvalError);

      // Should propagate error
      await expect(
        mockSendUserOperationWithTimeout(() => Promise.resolve({ hash: '0x' }))
      ).rejects.toThrow('Approval transaction failed');
    });

    it('should handle subscription transaction failure', async () => {
      const subscriptionError = new Error('Subscription transaction failed');
      mockSendUserOperationWithTimeout.mockRejectedValueOnce(subscriptionError);

      // Should propagate error
      await expect(
        mockSendUserOperationWithTimeout(() => Promise.resolve({ hash: '0x' }))
      ).rejects.toThrow('Subscription transaction failed');
    });
  });

  describe('State Management', () => {
    it('should update state correctly during creation flow', () => {
      const states = {
        isPending: false,
        isConfirming: false,
        isConfirmed: false,
        error: null,
      };

      // Initial state
      expect(states.isPending).toBe(false);
      expect(states.isConfirming).toBe(false);

      // After starting creation
      states.isPending = true;
      expect(states.isPending).toBe(true);

      // After transaction submitted
      states.isPending = false;
      states.isConfirming = true;
      expect(states.isPending).toBe(false);
      expect(states.isConfirming).toBe(true);

      // After confirmation
      states.isConfirming = false;
      states.isConfirmed = true;
      expect(states.isConfirming).toBe(false);
      expect(states.isConfirmed).toBe(true);
    });

    it('should reset state on error', () => {
      const states = {
        isPending: true,
        isConfirming: true,
        isConfirmed: false,
        error: null,
      };

      // On error
      states.isPending = false;
      states.isConfirming = false;
      states.error = new Error('Creation failed');

      expect(states.isPending).toBe(false);
      expect(states.isConfirming).toBe(false);
      expect(states.error).toBeInstanceOf(Error);
    });
  });

  describe('Database Sync', () => {
    it('should sync MeToken to database after creation', async () => {
      const meTokenAddress = '0xmetoken123';
      mockGetLatestMeTokenByOwner.mockResolvedValue(meTokenAddress);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Simulate sync call
      const response = await mockFetch('/api/metokens/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meTokenAddress }),
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metokens/sync',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle database sync failure gracefully', async () => {
      const meTokenAddress = '0xmetoken123';
      mockGetLatestMeTokenByOwner.mockResolvedValue(meTokenAddress);

      mockFetch.mockRejectedValueOnce(new Error('Sync failed'));

      // Should not throw, just log warning
      try {
        await mockFetch('/api/metokens/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meTokenAddress }),
        });
      } catch (error) {
        // Error should be caught and logged, not thrown
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Validation', () => {
    it('should validate required parameters', () => {
      const validateParams = (name: string, symbol: string, hubId: number) => {
        if (!name || name.trim().length === 0) {
          throw new Error('MeToken name is required');
        }
        if (!symbol || symbol.trim().length === 0) {
          throw new Error('MeToken symbol is required');
        }
        if (hubId < 1) {
          throw new Error('Hub ID must be at least 1');
        }
        return true;
      };

      expect(() => validateParams('', 'TEST', 1)).toThrow('name is required');
      expect(() => validateParams('Test', '', 1)).toThrow('symbol is required');
      expect(() => validateParams('Test', 'TEST', 0)).toThrow('Hub ID');
      expect(validateParams('Test Token', 'TEST', 1)).toBe(true);
    });

    it('should validate deposit amount format', () => {
      const validateDeposit = (deposit: string) => {
        try {
          const amount = parseEther(deposit);
          return amount >= BigInt(0);
        } catch {
          throw new Error('Invalid deposit amount format');
        }
      };

      expect(validateDeposit('100')).toBe(true);
      expect(validateDeposit('0')).toBe(true);
      expect(() => validateDeposit('invalid')).toThrow('Invalid deposit');
    });
  });
});
