import { useState, useEffect, useCallback } from 'react';
import { useUser, useSendUserOperation, useSmartAccountClient } from '@account-kit/react';
import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { meTokenSupabaseService, MeToken, MeTokenBalance } from '@/lib/sdk/supabase/metokens';
import { CreateMeTokenData, UpdateMeTokenData } from '@/lib/sdk/supabase/client';
import { getDaiTokenContract } from '@/lib/contracts/DAIToken';

// MeTokens contract addresses on Base
const METOKEN_FACTORY = '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B';
const DIAMOND = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';

// ABI for MeToken Factory
const METOKEN_FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "diamond",
        "type": "address"
      }
    ],
    "name": "create",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ABI for Diamond contract (key functions for MeTokens)
const DIAMOND_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      }
    ],
    "name": "getMeTokenInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "hubId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balancePooled",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balanceLocked",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "targetHubId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "migration",
            "type": "address"
          }
        ],
        "internalType": "struct MeTokenInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "assetsDeposited",
        "type": "uint256"
      }
    ],
    "name": "calculateMeTokensMinted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "meTokensMinted",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "meTokensBurned",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "calculateAssetsReturned",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "assetsReturned",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "assetsDeposited",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "mint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "meTokensMinted",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "meTokensBurned",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "burn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "assetsReturned",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "hubId",
        "type": "uint256"
      }
    ],
    "name": "getHubInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "vault",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "asset",
            "type": "address"
          }
        ],
        "internalType": "struct HubInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for MeToken
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface MeTokenInfo {
  owner: string;
  hubId: bigint;
  balancePooled: bigint;
  balanceLocked: bigint;
  startTime: bigint;
  endTime: bigint;
  endCooldown: bigint;
  targetHubId: bigint;
  migration: string;
}

export interface MeTokenData {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  balance: bigint;
  info: MeTokenInfo;
  tvl: number;
  hubId: number;
  balancePooled: bigint;
  balanceLocked: bigint;
  owner: string;
  created_at: string;
  updated_at: string;
}

export function useMeTokensSupabase(targetAddress?: string) {
  const user = useUser();
  const { client } = useSmartAccountClient({});
  const { sendUserOperation, isSendingUserOperation, error } = useSendUserOperation({ client });
  
  // Use targetAddress if provided, otherwise use the logged-in user's address
  const address = targetAddress || user?.address;

  const [userMeToken, setUserMeToken] = useState<MeTokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [meTokenError, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Convert Supabase MeToken to our MeTokenData format
  const convertToMeTokenData = useCallback(async (supabaseMeToken: MeToken, userAddress: string): Promise<MeTokenData> => {
    // Get user's balance from contract
    let userBalance = BigInt(0);
    try {
      if (client) {
        userBalance = await client.readContract({
          address: supabaseMeToken.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        }) as bigint;
      }
    } catch (err) {
      console.warn('Failed to fetch user balance from contract:', err);
    }

    return {
      address: supabaseMeToken.address,
      name: supabaseMeToken.name,
      symbol: supabaseMeToken.symbol,
      totalSupply: BigInt(supabaseMeToken.total_supply),
      balance: userBalance,
      info: {
        owner: supabaseMeToken.owner_address,
        hubId: BigInt(supabaseMeToken.hub_id),
        balancePooled: BigInt(supabaseMeToken.balance_pooled),
        balanceLocked: BigInt(supabaseMeToken.balance_locked),
        startTime: BigInt(0), // Not available in Supabase data
        endTime: BigInt(0), // Not available in Supabase data
        endCooldown: BigInt(0), // Not available in Supabase data
        targetHubId: BigInt(0), // Not available in Supabase data
        migration: "", // Not available in Supabase data
      },
      tvl: supabaseMeToken.tvl,
      hubId: supabaseMeToken.hub_id,
      balancePooled: BigInt(supabaseMeToken.balance_pooled),
      balanceLocked: BigInt(supabaseMeToken.balance_locked),
      owner: supabaseMeToken.owner_address,
      created_at: supabaseMeToken.created_at,
      updated_at: supabaseMeToken.updated_at,
    };
  }, [client]);

  // Check if user has a MeToken using API route
  const checkUserMeToken = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/metokens?owner=${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch MeToken: ${response.statusText}`);
      }
      
      const result = await response.json();
      const supabaseMeToken = result.data;
      
      if (supabaseMeToken) {
        const meTokenData = await convertToMeTokenData(supabaseMeToken, address);
        setUserMeToken(meTokenData);
      } else {
        setUserMeToken(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check MeToken');
      setUserMeToken(null);
    } finally {
      setLoading(false);
    }
  }, [address, convertToMeTokenData]);

  // Create a new MeToken
  const createMeToken = async (name: string, symbol: string, hubId: number = 1, assetsDeposited: string = "0") => {
    if (!address || !user) throw new Error('No wallet connected');
    
    setIsConfirming(false);
    setIsConfirmed(false);
    setError(null);
    
    try {
      // Step 1: Create the MeToken contract using the factory
      const createData = encodeFunctionData({
        abi: METOKEN_FACTORY_ABI,
        functionName: 'create',
        args: [name, symbol, DIAMOND],
      });

      const result = await sendUserOperation({
        uo: {
          target: METOKEN_FACTORY,
          data: createData,
          value: BigInt(0),
        },
      });

      if (result !== undefined) {
        setIsConfirming(true);
        // Wait for the transaction to be mined
        if (result && typeof result === 'object' && 'wait' in result) {
          await (result as any).wait();
        }
        setIsConfirming(false);
        setIsConfirmed(true);
        
        // Extract the deployed MeToken address from the transaction logs
        let meTokenAddress: string | null = null;
        
        if (result && typeof result === 'object' && 'hash' in result) {
          try {
            // Use the utility function to extract the MeToken address
            const { extractMeTokenAddressFromTransaction } = await import('@/lib/utils/metokenUtils');
            meTokenAddress = await extractMeTokenAddressFromTransaction((result as any).hash);
          } catch (error) {
            console.error('Failed to extract MeToken address from transaction:', error);
          }
        }
        
        if (!meTokenAddress) {
          throw new Error('Failed to extract MeToken contract address from transaction');
        }
        
        const createData: CreateMeTokenData = {
          address: meTokenAddress,
          owner_address: address,
          name,
          symbol,
          total_supply: 0,
          tvl: 0,
          hub_id: hubId,
          balance_pooled: 0,
          balance_locked: 0,
        };

        const createResponse = await fetch('/api/metokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createData),
        });
        
        if (!createResponse.ok) {
          throw new Error(`Failed to create MeToken record: ${createResponse.statusText}`);
        }
        
        // Record the creation transaction
        const meTokenResponse = await fetch(`/api/metokens?address=${meTokenAddress}`);
        const meTokenResult = await meTokenResponse.json();
        const meToken = meTokenResult.data;
        if (meToken) {
          await meTokenSupabaseService.recordTransaction({
            metoken_id: meToken.id,
            user_address: address,
            transaction_type: 'create',
            amount: 0,
            transaction_hash: (result as any)?.hash || '',
            block_number: (result as any)?.blockNumber || 0,
          });
        }
        
        // Refresh the user's MeToken data
        await checkUserMeToken();
      }
      
    } catch (err) {
      setIsConfirming(false);
      setIsConfirmed(false);
      
      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes('User denied') || err.message.includes('User rejected')) {
          throw new Error('Transaction was rejected by user');
        }
        throw err;
      }
      throw new Error('Failed to create MeToken');
    }
  };

  // Buy MeTokens with DAI approval handling
  const buyMeTokens = async (meTokenAddress: string, collateralAmount: string) => {
    if (!address || !user) throw new Error('No wallet connected');
    
    try {
      // First, ensure DAI approval
      await ensureDaiApproval(meTokenAddress, collateralAmount);
      
      // Then proceed with the mint transaction
      const result = await sendUserOperation({
        uo: {
          target: DIAMOND,
          data: encodeFunctionData({
            abi: DIAMOND_ABI,
            functionName: 'mint',
            args: [meTokenAddress as `0x${string}`, parseEther(collateralAmount), address as `0x${string}`],
          }),
          value: BigInt(0),
        },
      });

      if (result !== undefined) {
        if (result && typeof result === 'object' && 'wait' in result) {
          await (result as any).wait();
        }
        
        // Update MeToken data in Supabase
        const meToken = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);
        if (meToken) {
          // Record the transaction
          await meTokenSupabaseService.recordTransaction({
            metoken_id: meToken.id,
            user_address: address,
            transaction_type: 'mint',
            amount: parseFloat(collateralAmount),
            collateral_amount: parseFloat(collateralAmount),
            transaction_hash: (result as any)?.hash || '',
            block_number: (result as any)?.blockNumber || 0,
          });
          
          // Update user balance in Supabase
          const currentBalance = await meTokenSupabaseService.getUserMeTokenBalance(meTokenAddress, address);
          const newBalance = (currentBalance?.balance || 0) + parseFloat(collateralAmount);
          await meTokenSupabaseService.updateUserBalance(meTokenAddress, address, newBalance);
        }
        
        // Refresh data
        await checkUserMeToken();
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to buy MeTokens');
    }
  };

  // Ensure DAI approval for the meTokens vault
  const ensureDaiApproval = async (meTokenAddress: string, collateralAmount: string) => {
    if (!client || !address) throw new Error('Client or address not available');

    try {
      // Get the vault address from the meToken info
      const meTokenInfo = await client.readContract({
        address: DIAMOND,
        abi: DIAMOND_ABI,
        functionName: 'getMeTokenInfo',
        args: [meTokenAddress as `0x${string}`],
      });

      const hubId = (meTokenInfo as any).hubId;
      
      // Get hub info to find the vault address
      const hubInfo = await client.readContract({
        address: DIAMOND,
        abi: DIAMOND_ABI,
        functionName: 'getHubInfo',
        args: [hubId],
      });

      const vaultAddress = (hubInfo as any).vault;
      const daiContract = getDaiTokenContract('base');
      
      // Check current allowance
      const currentAllowance = await client.readContract({
        address: daiContract.address as `0x${string}`,
        abi: daiContract.abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, vaultAddress as `0x${string}`],
      });

      const requiredAmount = parseEther(collateralAmount);
      
      // If allowance is insufficient, approve the vault to spend DAI
      if (currentAllowance < requiredAmount) {
        await sendUserOperation({
          uo: {
            target: daiContract.address as `0x${string}`,
            data: encodeFunctionData({
              abi: daiContract.abi,
              functionName: 'approve',
              args: [vaultAddress as `0x${string}`, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')], // Max approval
            }),
            value: BigInt(0),
          },
        });
      }
    } catch (err) {
      console.error('Failed to ensure DAI approval:', err);
      throw new Error('Failed to approve DAI spending');
    }
  };

  // Sell MeTokens
  const sellMeTokens = async (meTokenAddress: string, meTokenAmount: string) => {
    if (!address || !user) throw new Error('No wallet connected');
    
    try {
      const result = await sendUserOperation({
        uo: {
          target: DIAMOND,
          data: encodeFunctionData({
            abi: DIAMOND_ABI,
            functionName: 'burn',
            args: [meTokenAddress as `0x${string}`, parseEther(meTokenAmount), address as `0x${string}`],
          }),
          value: BigInt(0),
        },
      });

      if (result !== undefined) {
        if (result && typeof result === 'object' && 'wait' in result) {
          await (result as any).wait();
        }
        
        // Update MeToken data in Supabase
        const meToken = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);
        if (meToken) {
          // Record the transaction
          await meTokenSupabaseService.recordTransaction({
            metoken_id: meToken.id,
            user_address: address,
            transaction_type: 'burn',
            amount: parseFloat(meTokenAmount),
            transaction_hash: (result as any)?.hash || '',
            block_number: (result as any)?.blockNumber || 0,
          });
          
          // Update user balance in Supabase
          const currentBalance = await meTokenSupabaseService.getUserMeTokenBalance(meTokenAddress, address);
          const newBalance = Math.max(0, (currentBalance?.balance || 0) - parseFloat(meTokenAmount));
          await meTokenSupabaseService.updateUserBalance(meTokenAddress, address, newBalance);
        }
        
        // Refresh data
        await checkUserMeToken();
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to sell MeTokens');
    }
  };

  // Calculate MeTokens to be minted
  const calculateMeTokensMinted = async (meTokenAddress: string, collateralAmount: string): Promise<string> => {
    try {
      if (!client) return '0';
      
      const result = await client.readContract({
        address: DIAMOND,
        abi: DIAMOND_ABI,
        functionName: 'calculateMeTokensMinted',
        args: [meTokenAddress as `0x${string}`, parseEther(collateralAmount)],
      });
      
      return formatEther(result as bigint);
    } catch (err) {
      console.error('Failed to calculate MeTokens minted:', err);
      return '0';
    }
  };

  // Calculate assets returned
  const calculateAssetsReturned = async (meTokenAddress: string, meTokenAmount: string): Promise<string> => {
    try {
      if (!client || !address) return '0';
      
      const result = await client.readContract({
        address: DIAMOND,
        abi: DIAMOND_ABI,
        functionName: 'calculateAssetsReturned',
        args: [meTokenAddress as `0x${string}`, parseEther(meTokenAmount), address as `0x${string}`],
      });
      
      return formatEther(result as bigint);
    } catch (err) {
      console.error('Failed to calculate assets returned:', err);
      return '0';
    }
  };

  // Check for a specific MeToken by address
  const checkSpecificMeToken = async (meTokenAddress: string) => {
    if (!address || !client) return null;
    
    try {
      const supabaseMeToken = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);
      
      if (supabaseMeToken && supabaseMeToken.owner_address.toLowerCase() === address.toLowerCase()) {
        const meTokenData = await convertToMeTokenData(supabaseMeToken, address);
        setUserMeToken(meTokenData);
        return meTokenData;
      }
      
      return null;
    } catch (err) {
      console.error(`Failed to check MeToken ${meTokenAddress}:`, err);
      return null;
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!address) return;

    const subscription = meTokenSupabaseService.subscribeToBalanceUpdates(address, (payload) => {
      console.log('Balance update received:', payload);
      // Refresh data when balance changes
      checkUserMeToken();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [address, checkUserMeToken]);

  useEffect(() => {
    if (address) {
      checkUserMeToken();
    }
  }, [address, checkUserMeToken]);

  return {
    userMeToken,
    loading,
    error: meTokenError,
    createMeToken,
    buyMeTokens,
    sellMeTokens,
    calculateMeTokensMinted,
    calculateAssetsReturned,
    checkSpecificMeToken,
    isPending: isSendingUserOperation,
    isConfirming,
    isConfirmed,
    transactionError: error,
  };
}
