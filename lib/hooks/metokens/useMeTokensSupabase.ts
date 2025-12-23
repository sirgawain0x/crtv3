import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, useSmartAccountClient } from '@account-kit/react';
import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { meTokenSupabaseService, MeToken, MeTokenBalance } from '@/lib/sdk/supabase/metokens';
import { CreateMeTokenData, UpdateMeTokenData } from '@/lib/sdk/supabase/client';
import { getMeTokenFactoryContract, METOKEN_FACTORY_ADDRESSES } from '@/lib/contracts/MeTokenFactory';
import { METOKEN_ABI } from '@/lib/contracts/MeToken';
import { DAI_TOKEN_ADDRESSES, getDaiTokenContract } from '@/lib/contracts/DAIToken';
import { useToast } from '@/components/ui/use-toast';

// MeTokens contract addresses on Base
const METOKEN_FACTORY = '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B';
const DIAMOND = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';


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
  const { toast } = useToast();

  // Use targetAddress if provided, otherwise use the smart account address from client
  const address = targetAddress || client?.account?.address || user?.address;

  const [userMeToken, setUserMeToken] = useState<MeTokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [meTokenError, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [transactionError, setTransactionError] = useState<Error | null>(null);

  // Convert Supabase MeToken to our MeTokenData format
  const convertToMeTokenData = useCallback(async (supabaseMeToken: MeToken, userAddress: string): Promise<MeTokenData> => {
    // Get user's balance from contract
    let userBalance = BigInt(0);
    try {
      if (client) {
        console.log('🔍 Fetching user balance for MeToken:', supabaseMeToken.address);
        userBalance = await client.readContract({
          address: supabaseMeToken.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        }) as bigint;
        console.log('✅ User balance fetched:', userBalance.toString());
      } else {
        console.warn('⚠️ No client available for balance check');
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch user balance from contract (this is OK, will use 0):', err);
      // Set balance to 0 if we can't fetch it - this is fine for display purposes
      userBalance = BigInt(0);
    }

    // Get fresh data from contract
    let currentTotalSupply = BigInt(supabaseMeToken?.total_supply || 0);
    let currentInfo = {
      owner: supabaseMeToken?.owner_address || userAddress,
      hubId: BigInt(supabaseMeToken?.hub_id || 0),
      balancePooled: BigInt(supabaseMeToken?.balance_pooled || 0),
      balanceLocked: BigInt(supabaseMeToken?.balance_locked || 0),
      startTime: BigInt(0),
      endTime: BigInt(0),
      endCooldown: BigInt(0),
      targetHubId: BigInt(0),
      migration: "0x0000000000000000000000000000000000000000",
    };

    try {
      if (client && supabaseMeToken?.address) {
        console.log('🔍 Fetching fresh contract data for MeToken:', supabaseMeToken.address);

        // Fetch total supply
        const supplyData = await client.readContract({
          address: supabaseMeToken.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'totalSupply',
        }) as bigint;
        currentTotalSupply = supplyData;

        // Fetch MeToken Info from Diamond
        const infoData = await client.readContract({
          address: DIAMOND,
          abi: METOKEN_ABI,
          functionName: 'getMeTokenInfo',
          args: [supabaseMeToken.address as `0x${string}`],
        }) as any;

        if (infoData) {
          currentInfo = {
            owner: infoData.owner,
            hubId: BigInt(infoData.hubId || 0),
            balancePooled: BigInt(infoData.balancePooled || 0),
            balanceLocked: BigInt(infoData.balanceLocked || 0),
            startTime: BigInt(infoData.startTime || 0),
            endTime: BigInt(infoData.endTime || 0),
            endCooldown: BigInt(infoData.endCooldown || 0),
            targetHubId: BigInt(infoData.targetHubId || 0),
            migration: infoData.migration || "0x0000000000000000000000000000000000000000",
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch fresh contract data, using Supabase fallback:', err);
    }

    // Calculate TVL (simplified: pooled DAI + locked DAI)
    // Note: Only DAI is considered for value here. 
    const calculatedTvl = parseFloat(formatEther(currentInfo.balancePooled + currentInfo.balanceLocked));

    return {
      address: supabaseMeToken.address,
      name: supabaseMeToken.name,
      symbol: supabaseMeToken.symbol,
      totalSupply: currentTotalSupply,
      balance: userBalance,
      info: currentInfo,
      tvl: calculatedTvl > 0 ? calculatedTvl : supabaseMeToken.tvl,
      hubId: Number(currentInfo.hubId),
      balancePooled: currentInfo.balancePooled,
      balanceLocked: currentInfo.balanceLocked,
      owner: currentInfo.owner,
      created_at: supabaseMeToken.created_at,
      updated_at: supabaseMeToken.updated_at,
    };
  }, [client]);


  // Check if user has a MeToken using Subgraph first, then API logic
  const checkUserMeToken = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      let foundInSubgraph = false;

      // 1. Try fetching from Subgraph (fastest & decentralized)
      try {
        const { meTokensSubgraph } = await import('@/lib/sdk/metokens/subgraph');
        const subgraphTokens = await meTokensSubgraph.getMeTokensByOwner(address);

        if (subgraphTokens.length > 0) {
          console.log('✅ Found MeToken in Subgraph:', subgraphTokens[0]);
          const latestToken = subgraphTokens[0];

          if (client) {
            // We need to fetch name/symbol/totalSupply from contract since subgraph might just have ID
            const contractAddress = latestToken.id as `0x${string}`;

            const [name, symbol, totalSupply] = await Promise.all([
              client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'name' }),
              client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'symbol' }),
              client.readContract({ address: contractAddress, abi: ERC20_ABI, functionName: 'totalSupply' })
            ]) as [string, string, bigint];

            // Get fresh info from Diamond for pooled/locked
            let currentInfo = {
              owner: latestToken.owner || address,
              hubId: BigInt(latestToken.hubId || 1),
              balancePooled: BigInt(latestToken.balancePooled || 0),
              balanceLocked: BigInt(latestToken.balanceLocked || 0),
              startTime: BigInt(latestToken.startTime || 0),
              endTime: BigInt(latestToken.endTime || 0),
              endCooldown: BigInt(latestToken.endCooldown || 0),
              targetHubId: BigInt(latestToken.targetHubId || 0),
              migration: latestToken.migration || "0x0000000000000000000000000000000000000000",
            };

            // Try to refresh info from contract if possible
            try {
              const infoData = await client.readContract({
                address: DIAMOND,
                abi: METOKEN_ABI,
                functionName: 'getMeTokenInfo',
                args: [contractAddress],
              }) as any;
              if (infoData) {
                currentInfo = {
                  owner: infoData.owner,
                  hubId: BigInt(infoData.hubId),
                  balancePooled: BigInt(infoData.balancePooled),
                  balanceLocked: BigInt(infoData.balanceLocked),
                  startTime: BigInt(infoData.startTime),
                  endTime: BigInt(infoData.endTime),
                  endCooldown: BigInt(infoData.endCooldown),
                  targetHubId: BigInt(infoData.targetHubId),
                  migration: infoData.migration,
                };
              }
            } catch (e) {
              console.warn('⚠️ Failed to refresh info from contract, using subgraph data', e);
            }

            // Calculate TVL
            const calculatedTvl = parseFloat(formatEther(currentInfo.balancePooled + currentInfo.balanceLocked));

            // Get user balance
            let userBalance = BigInt(0);
            try {
              userBalance = await client.readContract({
                address: contractAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address as `0x${string}`],
              }) as bigint;
            } catch (e) { }

            const meTokenData: MeTokenData = {
              address: latestToken.id,
              name,
              symbol,
              totalSupply,
              balance: userBalance,
              info: currentInfo,
              tvl: calculatedTvl,
              hubId: Number(currentInfo.hubId),
              balancePooled: currentInfo.balancePooled,
              balanceLocked: currentInfo.balanceLocked,
              owner: currentInfo.owner,
              created_at: new Date(Number(currentInfo.startTime) * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            };

            setUserMeToken(meTokenData);
            foundInSubgraph = true;
          }
        }
      } catch (subgraphErr) {
        console.warn('⚠️ Subgraph check failed, falling back to API:', subgraphErr);
      }

      if (foundInSubgraph) {
        setLoading(false);
        return;
      }

      // 2. Fallback to API/Supabase if not found in subgraph
      console.log('🔄 Checking Supabase API...');
      // Try primary address first
      let response = await fetch(`/api/metokens?owner=${address}`);
      let result = await response.json();
      let supabaseMeToken = result.data;

      // If not found, try the smart account address (if we have a client)
      if (!supabaseMeToken && client?.account?.address && client.account.address !== address) {
        console.log('🔍 Checking smart account address for MeToken:', client.account.address);
        response = await fetch(`/api/metokens?owner=${client.account.address}`);
        result = await response.json();
        supabaseMeToken = result.data;
      }

      // If still not found and we have a user with different EOA, try that too
      if (!supabaseMeToken && user?.address && user.address !== address) {
        console.log('🔍 Checking EOA address for MeToken:', user.address);
        response = await fetch(`/api/metokens?owner=${user.address}`);
        result = await response.json();
        supabaseMeToken = result.data;
      }

      if (supabaseMeToken) {
        console.log('✅ Found MeToken via API:', supabaseMeToken);
        const meTokenData = await convertToMeTokenData(supabaseMeToken, address);
        setUserMeToken(meTokenData);
      } else {
        console.log('❌ No MeToken found for any address');
        setUserMeToken(null);
      }
    } catch (err) {
      console.error('❌ Error checking MeToken:', err);

      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes('MeToken not found') || err.message.includes('404')) {
          // This is expected when no MeToken exists for the user
          console.log('ℹ️ No MeToken found for user - this is normal');
          setUserMeToken(null);
          setError(null); // Don't show error for missing MeToken
        } else {
          setError(err.message);
          setUserMeToken(null);
        }
      } else {
        setError('Failed to check MeToken');
        setUserMeToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [address, user, client, convertToMeTokenData]);

  // Internal function to create MeToken (used for retries)
  const createMeTokenInternal = async (name: string, symbol: string, hubId: number = 1, assetsDeposited: string = "0", isRetry: boolean = false) => {
    console.log('🔧 createMeToken called', { name, symbol, hubId, assetsDeposited, address, user });

    if (!address) {
      const errorMsg = 'No wallet address available';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    if (!user) {
      const errorMsg = 'No user connected - please ensure your smart account is properly initialized';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    if (!client) {
      const errorMsg = 'Smart account client not initialized';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // First, check if user already has a MeToken to prevent the "already owns" error
    console.log('🔍 Checking if user already has a MeToken...');
    try {
      // Check database first
      await checkUserMeToken();
      if (userMeToken) {
        console.log('⚠️ User already has a MeToken in database:', userMeToken.address);
        throw new Error('You already have a MeToken. Please use the existing one or contact support if you need to create a new one.');
      }

      // Also check subgraph for any MeTokens that might not be in database yet
      console.log('🔍 Checking subgraph for existing MeTokens...');
      const { meTokensSubgraph } = await import('@/lib/sdk/metokens/subgraph');
      const allMeTokens = await meTokensSubgraph.getAllMeTokens(50, 0);
      console.log(`📋 Found ${allMeTokens.length} recent MeTokens in subgraph`);

      // Check if any of these MeTokens belong to our user
      for (const meToken of allMeTokens.slice(0, 10)) {
        try {
          console.log('🔍 Checking MeToken ownership:', meToken.id);
          const { getMeTokenInfoFromBlockchain } = await import('@/lib/utils/metokenUtils');
          const meTokenInfo = await getMeTokenInfoFromBlockchain(meToken.id);
          if (meTokenInfo && meTokenInfo.owner.toLowerCase() === address.toLowerCase()) {
            console.log('⚠️ User already has a MeToken in subgraph:', meToken.id);
            throw new Error('You already have a MeToken. Please use the existing one or contact support if you need to create a new one.');
          }
        } catch (err) {
          console.warn('Failed to check MeToken ownership:', meToken.id, err);
        }
      }

      // Additional check: Query the Diamond contract directly to see if user already owns a meToken
      console.log('🔍 Checking Diamond contract for existing MeToken ownership...');
      try {
        const { getLatestMeTokenByOwner } = await import('@/lib/utils/metokenUtils');

        // Check multiple addresses that could be the meToken owner
        const addressesToCheck = [address];
        if (client?.account?.address && client.account.address !== address) {
          addressesToCheck.push(client.account.address);
        }
        if (user?.address && user.address !== address) {
          addressesToCheck.push(user.address);
        }

        console.log('🔍 Checking addresses for existing MeTokens:', addressesToCheck);

        for (const checkAddress of addressesToCheck) {
          const existingMeTokenAddress = await getLatestMeTokenByOwner(checkAddress);
          if (existingMeTokenAddress) {
            console.log('⚠️ User already has a MeToken according to Diamond contract:', existingMeTokenAddress, 'for address:', checkAddress);
            throw new Error('You already have a MeToken. Please use the "Sync Existing MeToken" button to load it.');
          }
        }
      } catch (diamondErr) {
        // This is expected if the user doesn't have a meToken, so we continue
        console.log('✅ No existing MeToken found in Diamond contract (this is expected for new users)');
      }

      console.log('✅ No existing MeToken found, proceeding with creation...');
    } catch (checkErr) {
      if (checkErr instanceof Error && checkErr.message.includes('already have a MeToken')) {
        throw checkErr; // Re-throw the "already have" error
      }
      console.log('ℹ️ No existing MeToken found, proceeding with creation...');
    }

    // Debug: Log address information
    console.log('🔍 Address debugging:', {
      smartAccountAddress: address,
      userEOAAddress: user.address,
      clientAccountAddress: client.account?.address,
      addressesMatch: address === user.address
    });

    // Check if smart account is deployed
    try {
      const code = await client.getCode({ address: address as `0x${string}` });
      console.log('🏗️ Smart account deployment status:', {
        address: address,
        hasCode: code !== '0x',
        codeLength: code ? code.length : 0
      });

      if (code === '0x') {
        console.warn('⚠️ Smart account appears to be undeployed. This might cause issues with token interactions.');
      }
    } catch (deployErr) {
      console.warn('⚠️ Could not check smart account deployment status:', deployErr);
    }

    setIsPending(true);
    setIsConfirming(false);
    setIsConfirmed(false);
    setError(null);
    setTransactionError(null);

    try {
      // COMBINED STEP: Create AND Subscribe in one transaction
      // This is more efficient and ensures the MeToken is registered with the protocol
      console.log('📦 Creating and subscribing MeToken...');

      const depositAmount = parseEther(assetsDeposited);

      // If depositing DAI, we need to approve the Diamond contract first
      if (depositAmount > BigInt(0)) {
        console.log('💰 Depositing DAI, checking approval...');

        // DAI contract address on Base
        const DAI_ADDRESS = DAI_TOKEN_ADDRESSES.base;
        const daiContract = getDaiTokenContract('base');

        // First, check if user has sufficient DAI balance
        console.log('💳 Checking DAI balance...');
        console.log('🔍 DAI balance check details:', {
          daiContractAddress: DAI_ADDRESS,
          smartAccountAddress: address,
          userEOAAddress: user?.address,
          clientAccountAddress: client.account?.address
        });

        let daiBalance: bigint;
        try {
          daiBalance = await client.readContract({
            address: daiContract.address as `0x${string}`,
            abi: daiContract.abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
          }) as bigint;

          console.log('✅ DAI balance check successful');
        } catch (balanceErr) {
          console.error('❌ DAI balance check failed:', balanceErr);
          throw new Error(`Failed to check DAI balance: ${balanceErr instanceof Error ? balanceErr.message : 'Unknown error'}`);
        }

        console.log('📊 DAI balance result:', {
          balanceWei: daiBalance.toString(),
          balanceDAI: formatEther(daiBalance),
          requiredWei: depositAmount.toString(),
          requiredDAI: formatEther(depositAmount),
          hasEnough: daiBalance >= depositAmount
        });

        if (daiBalance < depositAmount) {
          // If smart account has no DAI, check if EOA has DAI (in case of address confusion)
          if (user?.address && user.address !== address) {
            console.log('🔍 Smart account has no DAI, checking EOA balance...');
            try {
              const eoaBalance = await client.readContract({
                address: daiContract.address as `0x${string}`,
                abi: daiContract.abi,
                functionName: 'balanceOf',
                args: [user.address as `0x${string}`]
              }) as bigint;

              console.log('📊 EOA DAI balance:', {
                balanceWei: eoaBalance.toString(),
                balanceDAI: formatEther(eoaBalance),
                eoaAddress: user.address
              });

              if (eoaBalance >= depositAmount) {
                throw new Error(
                  `DAI is in your EOA wallet (${user.address}) but the transaction is being sent from your smart account (${address}). ` +
                  'Please transfer DAI to your smart account first.'
                );
              }
            } catch (eoaErr) {
              console.warn('⚠️ Failed to check EOA balance:', eoaErr);
            }
          }

          throw new Error(
            `Insufficient DAI balance in smart account (${address}). You have ${formatEther(daiBalance)} DAI ` +
            `but need ${formatEther(depositAmount)} DAI. Please ensure your DAI is in your smart account wallet.`
          );
        }

        // Check current allowance
        const currentAllowance = await client.readContract({
          address: daiContract.address as `0x${string}`,
          abi: daiContract.abi,
          functionName: 'allowance',
          args: [address as `0x${string}`, DIAMOND as `0x${string}`]
        }) as bigint;

        console.log('📊 Current DAI allowance:', currentAllowance.toString());

        if (currentAllowance < depositAmount) {
          console.log('🔓 Approving DAI...');

          const approveData = encodeFunctionData({
            abi: daiContract.abi,
            functionName: 'approve',
            args: [DIAMOND as `0x${string}`, depositAmount],
          });

          console.log('📤 Sending DAI approval user operation...');
          console.log('📊 Approval details:', {
            target: DAI_ADDRESS,
            spender: DIAMOND,
            amount: depositAmount.toString(),
            smartAccountAddress: address,
            approvalData: approveData
          });

          const approveOp = await client.sendUserOperation({
            uo: {
              target: daiContract.address as `0x${string}`,
              data: approveData,
              value: BigInt(0),
            },
          });

          console.log('🎉 Approval UserOperation sent! Hash:', approveOp.hash);
          console.log('⏳ Waiting for approval confirmation...');

          const approvalTxHash = await client.waitForUserOperationTransaction({
            hash: approveOp.hash,
          });

          console.log('✅ Approval transaction confirmed! Hash:', approvalTxHash);

          console.log('✅ DAI approved!');

          // Wait for the approval state to propagate with retry logic
          console.log('⏳ Waiting for approval state to update...');
          let newAllowance = BigInt(0);
          let retryCount = 0;
          const maxRetries = 5;

          while (retryCount < maxRetries && newAllowance < depositAmount) {
            // Wait progressively longer between retries
            const waitTime = 2000 + (retryCount * 1000); // 2s, 3s, 4s, 5s, 6s
            console.log(`⏳ Waiting ${waitTime}ms for approval state to update... (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            try {
              // Verify the approval was successful
              newAllowance = await client.readContract({
                address: daiContract.address as `0x${string}`,
                abi: daiContract.abi,
                functionName: 'allowance',
                args: [address as `0x${string}`, DIAMOND as `0x${string}`]
              }) as bigint;

              console.log(`📊 DAI allowance check ${retryCount + 1}: ${newAllowance.toString()} (expected: ${depositAmount.toString()})`);

              if (newAllowance >= depositAmount) {
                console.log('✅ DAI allowance confirmed!');
                break;
              }
            } catch (err) {
              console.warn(`⚠️ Allowance check failed on attempt ${retryCount + 1}:`, err);
            }

            retryCount++;
          }

          if (newAllowance < depositAmount) {
            console.error('❌ DAI approval verification failed after all retries');
            console.error('📊 Final allowance:', newAllowance.toString());
            console.error('📊 Expected allowance:', depositAmount.toString());
            console.error('📊 Smart account address:', address);
            console.error('📊 DIAMOND address:', DIAMOND);

            // Provide helpful error message with suggestions
            const errorMsg = `DAI approval failed after ${maxRetries} retries. This could be due to:
1. Network congestion - try again in a few minutes
2. Smart account deployment issue - ensure your account is properly deployed
3. Insufficient gas - the approval transaction may have failed
4. RPC provider issues - try refreshing the page

Expected allowance: ${formatEther(depositAmount)} DAI
Actual allowance: ${formatEther(newAllowance)} DAI

You can try creating your MeToken with 0 DAI deposit and add liquidity later.`;

            throw new Error(errorMsg);
          }
        } else {
          console.log('✅ Sufficient DAI allowance already exists');
        }
      }

      const SUBSCRIBE_ABI = [{
        "inputs": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "symbol", "type": "string" },
          { "internalType": "uint256", "name": "hubId", "type": "uint256" },
          { "internalType": "uint256", "name": "assetsDeposited", "type": "uint256" }
        ],
        "name": "subscribe",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }] as const;

      const subscribeData = encodeFunctionData({
        abi: SUBSCRIBE_ABI,
        functionName: 'subscribe',
        args: [name, symbol, BigInt(hubId), depositAmount],
      });

      console.log('🔨 Encoded subscribe data');

      console.log('📤 Sending subscribe user operation via client...');
      const operation = await client.sendUserOperation({
        uo: {
          target: DIAMOND, // Subscribe is called on the Diamond contract
          data: subscribeData,
          value: BigInt(0),
        },
      });

      console.log('🎉 UserOperation sent! Hash:', operation.hash);
      setIsPending(false);
      setIsConfirming(true);

      console.log('⏳ Waiting for transaction confirmation...');
      const txHash = await client.waitForUserOperationTransaction({
        hash: operation.hash,
      });

      console.log('✅ Transaction mined! Hash:', txHash);

      // For UserOperations (EIP-4337), we need to use the subgraph to find the MeToken
      // The subgraph indexes Subscribe events which contain the MeToken address

      console.log('🔍 Querying subgraph for newly created MeToken...');

      let meTokenAddress: string | null = null;

      try {
        // Import the subgraph client
        const { meTokensSubgraph } = await import('@/lib/sdk/metokens/subgraph');

        // Wait for subgraph to index the event (usually takes a few seconds)
        console.log('⏳ Waiting 3s for subgraph indexing...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get all recent MeTokens from subgraph
        console.log('📊 Fetching recent MeTokens from subgraph...');
        const allMeTokens = await meTokensSubgraph.getAllMeTokens(20, 0);
        console.log(`📋 Found ${allMeTokens.length} recent MeTokens from subgraph`);

        if (allMeTokens.length > 0) {
          console.log('Recent MeTokens:', allMeTokens.slice(0, 3).map(mt => mt.id));

          // The most recent one (first in the list) is most likely ours since we just created it
          // Skip ownership verification from Diamond as it may not be fully registered yet
          meTokenAddress = allMeTokens[0].id;
          console.log('✅ Using most recent MeToken from subgraph:', meTokenAddress);
        }

        if (meTokenAddress) {
          // Sync the MeToken to the database
          console.log('💾 Syncing MeToken to database...');
          const syncResponse = await fetch('/api/metokens/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meTokenAddress,
              transactionHash: txHash
            })
          });

          if (syncResponse.ok) {
            console.log('✅ MeToken synced to database successfully');
            setIsConfirming(false);
            setIsConfirmed(true);

            // Refresh the user's MeToken data
            await checkUserMeToken();
            return;
          } else {
            const error = await syncResponse.json();
            console.warn('⚠️ Failed to sync MeToken:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error querying subgraph:', error);
      }

      // If we couldn't find/sync the MeToken, still show success and auto-refresh
      console.log('🎉 MeToken created successfully!');
      console.log('💡 Transaction hash:', txHash);
      console.log('🔄 Refreshing page in 5 seconds to pick up your MeToken...');

      setIsConfirming(false);
      setIsConfirmed(true);

      // Auto-refresh after a longer delay to allow subgraph indexing
      setTimeout(() => {
        window.location.reload();
      }, 5000);

      return;

    } catch (err) {
      console.error('❌ Error in createMeToken:', err);
      setIsPending(false);
      setIsConfirming(false);

      // Handle specific error cases
      if (err instanceof Error) {
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);

        // Check if it's a DAI approval error and offer fallback
        if (err.message.includes('DAI approval failed') && parseFloat(assetsDeposited) > 0) {
          console.log('💡 DAI approval failed, but user can still create MeToken with 0 DAI');

          toast({
            title: "DAI Approval Failed",
            description: "Creating MeToken without initial DAI deposit. You can add liquidity later.",
            duration: 5000,
          });

          // Retry with 0 DAI deposit
          try {
            console.log('🔄 Retrying MeToken creation with 0 DAI deposit...');
            await createMeTokenInternal(name, symbol, hubId, "0", true);
            return; // Exit successfully
          } catch (retryErr) {
            console.error('❌ Retry with 0 DAI also failed:', retryErr);
            // Fall through to original error handling
          }
        }

        // Check if user already owns a MeToken
        if (err.message.includes('already owns a meToken') || err.message.includes('already owns')) {
          console.log('💡 User already owns a MeToken! Finding and syncing it...');

          try {
            // Query subgraph for recent MeTokens
            const { meTokensSubgraph } = await import('@/lib/sdk/metokens/subgraph');
            console.log('📊 Fetching recent MeTokens from subgraph...');
            const allMeTokens = await meTokensSubgraph.getAllMeTokens(50, 0);
            console.log(`📋 Found ${allMeTokens.length} recent MeTokens in subgraph`);

            let foundUserMeToken = false;

            if (allMeTokens.length > 0) {
              // Try to sync the most recent ones to database
              for (const meToken of allMeTokens.slice(0, 10)) {
                try {
                  console.log('💾 Attempting to sync MeToken:', meToken.id);
                  const syncResponse = await fetch('/api/metokens/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meTokenAddress: meToken.id })
                  });

                  if (syncResponse.ok) {
                    const syncData = await syncResponse.json();
                    console.log('✅ Synced MeToken:', syncData);

                    // Check if this one belongs to our user
                    if (syncData.data?.owner_address?.toLowerCase() === address.toLowerCase()) {
                      console.log('🎯 Found our MeToken!');
                      foundUserMeToken = true;
                      break;
                    }
                  }
                } catch (syncErr) {
                  console.warn('Failed to sync MeToken:', meToken.id, syncErr);
                }
              }
            }

            if (foundUserMeToken) {
              // Refresh to load the MeToken from database
              console.log('🔄 Refreshing to display your MeToken...');
              await checkUserMeToken();

              setIsConfirmed(true);

              toast({
                title: "MeToken Found!",
                description: "Your existing MeToken has been synced and is now displayed.",
                duration: 3000,
              });

              setTimeout(() => {
                window.location.reload();
              }, 2000);

              return;
            } else {
              // If we couldn't find the user's MeToken, provide helpful instructions
              console.log('⚠️ Could not find user MeToken in subgraph');
              throw new Error('You already have a MeToken, but we could not locate it automatically. ' +
                'Please use the "Sync Existing MeToken" button or contact support for assistance.');
            }
          } catch (syncErr) {
            console.error('Failed to find existing MeToken:', syncErr);
            if (syncErr instanceof Error && syncErr.message.includes('already have a MeToken')) {
              throw syncErr; // Re-throw our custom error
            }
            throw new Error('You already have a MeToken, but we could not load it. ' +
              'Please use the "Sync Existing MeToken" button or contact support.');
          }
        }

        setTransactionError(err);
        if (err.message.includes('User denied') || err.message.includes('User rejected')) {
          throw new Error('Transaction was rejected by user');
        }
        throw err;
      }
      console.error('❌ Unknown error type:', typeof err);
      const error = new Error('Failed to create MeToken');
      setTransactionError(error);
      throw error;
    }
  };

  // Public wrapper function for createMeToken
  const createMeToken = async (name: string, symbol: string, hubId: number = 1, assetsDeposited: string = "0") => {
    return createMeTokenInternal(name, symbol, hubId, assetsDeposited, false);
  };

  // Buy MeTokens
  const buyMeTokens = async (
    meTokenAddress: string,
    collateralAmount: string,
    videoTracking?: { video_id?: number; playback_id?: string }
  ) => {
    if (!address || !user) throw new Error('No wallet connected');
    if (!client) throw new Error('Smart account client not initialized');

    setIsPending(true);
    setIsConfirming(false);
    setTransactionError(null);

    try {
      // Get the vault address that will actually perform transferFrom
      // 1. Get meToken's hubId
      const meTokenInfo = await client.readContract({
        address: DIAMOND,
        abi: METOKEN_ABI,
        functionName: 'getMeTokenInfo',
        args: [meTokenAddress as `0x${string}`],
      }) as any;

      const hubId = meTokenInfo.hubId || meTokenInfo[1] || BigInt(1);

      // 2. Get vault address for this hub
      const hubInfo = await client.readContract({
        address: DIAMOND,
        abi: METOKEN_ABI,
        functionName: 'getHubInfo',
        args: [hubId],
      }) as any;

      // Extract vault address (index 6 in the tuple)
      let vaultAddress: string;
      if (Array.isArray(hubInfo)) {
        vaultAddress = hubInfo[6] as string;
      } else if (typeof hubInfo === 'object' && 'vault' in hubInfo) {
        vaultAddress = hubInfo.vault as string;
      } else {
        vaultAddress = (hubInfo as any)[6] || (hubInfo as any).vault;
      }

      // Fallback to Diamond if vault is zero address (shouldn't happen, but safe)
      if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('⚠️ Vault address is zero, falling back to Diamond');
        vaultAddress = DIAMOND;
      }

      console.log('🔍 Mint flow: Using vault address:', vaultAddress, 'for Hub ID:', hubId.toString());

      // 3. Check and approve DAI for the vault (not Diamond!)
      const daiContract = getDaiTokenContract('base');
      const collateralAmountWei = parseEther(collateralAmount);

      const currentAllowance = await client.readContract({
        address: daiContract.address as `0x${string}`,
        abi: daiContract.abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, vaultAddress as `0x${string}`],
      }) as bigint;

      console.log('📊 Current DAI allowance for vault:', {
        vaultAddress,
        currentAllowance: currentAllowance.toString(),
        required: collateralAmountWei.toString(),
        hasEnough: currentAllowance >= collateralAmountWei,
      });

      if (currentAllowance < collateralAmountWei) {
        console.log('🔓 Approving DAI for vault...');
        const approveData = encodeFunctionData({
          abi: daiContract.abi,
          functionName: 'approve',
          args: [vaultAddress as `0x${string}`, collateralAmountWei],
        });

        const approveOp = await client.sendUserOperation({
          uo: {
            target: daiContract.address as `0x${string}`,
            data: approveData,
            value: BigInt(0),
          },
        });

        console.log('⏳ Waiting for approval confirmation...');
        await client.waitForUserOperationTransaction({
          hash: approveOp.hash,
        });

        console.log('✅ DAI approved for vault');
      } else {
        console.log('✅ Sufficient DAI allowance already exists for vault');
      }

      // 4. Now mint (the vault will use the allowance we just set)
      const operation = await client.sendUserOperation({
        uo: {
          target: DIAMOND,
          data: encodeFunctionData({
            abi: METOKEN_ABI,
            functionName: 'mint',
            args: [meTokenAddress as `0x${string}`, parseEther(collateralAmount), address as `0x${string}`],
          }),
          value: BigInt(0),
        },
      });

      setIsPending(false);
      setIsConfirming(true);

      const txHash = await client.waitForUserOperationTransaction({
        hash: operation.hash,
      });

      setIsConfirming(false);
      setIsConfirmed(true);

      // Update MeToken data in Supabase via API route (uses service role client)
      const meToken = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);
      if (meToken) {
        // Record the transaction with video tracking if provided via API route
        try {
          const response = await fetch(`/api/metokens/${meTokenAddress}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_address: address,
              transaction_type: 'mint',
              amount: parseFloat(collateralAmount),
              collateral_amount: parseFloat(collateralAmount),
              transaction_hash: txHash,
              block_number: 0,
              video_id: videoTracking?.video_id,
              playback_id: videoTracking?.playback_id,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to record transaction:', error);
            // Don't throw - transaction succeeded on-chain, just logging failed
          }
        } catch (error) {
          console.error('Error recording transaction:', error);
          // Don't throw - transaction succeeded on-chain, just logging failed
        }

        // Update user balance in Supabase via API route (uses service role client)
        try {
          // Read actual balance from chain to ensure accuracy
          const actualBalance = await client.readContract({
            address: meTokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          }) as bigint;

          const newBalance = parseFloat(formatEther(actualBalance));
          console.log(`📊 Syncing balance to Supabase: ${newBalance} (Chain balance: ${actualBalance.toString()})`);

          const balanceResponse = await fetch(`/api/metokens/${meTokenAddress}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_address: address,
              balance: newBalance,
            }),
          });

          if (!balanceResponse.ok) {
            let errorMsg = 'Unknown error';
            try {
              const errorBody = await balanceResponse.text();
              errorMsg = errorBody;
              try {
                // Try to format JSON for better readability
                errorMsg = JSON.stringify(JSON.parse(errorBody), null, 2);
              } catch { }
            } catch (readErr) {
              errorMsg = `Could not read response body: ${readErr}`;
            }
            console.error(`Failed to update user balance (Status: ${balanceResponse.status}): ${errorMsg}`);
            // Don't throw - transaction succeeded on-chain, just logging failed
          } else {
            console.log('✅ User balance synced to Supabase successfully');
          }
        } catch (error) {
          console.warn('⚠️ Error updating user balance in Supabase:', error);
          // Don't throw - transaction succeeded on-chain, just logging failed
        }
      }

      setIsConfirming(false);
      setIsConfirmed(true);

      // Refresh data
      await checkUserMeToken();
      return txHash;
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      const error = err instanceof Error ? err : new Error('Failed to buy MeTokens');
      setTransactionError(error);
      throw error;
    }
  };

  // Ensure DAI approval for the meTokens vault
  const ensureDaiApproval = async (meTokenAddress: string, collateralAmount: string) => {
    if (!client || !address) throw new Error('Client or address not available');

    try {
      // Get the vault address that will actually perform transferFrom
      // 1. Get meToken's hubId
      const meTokenInfo = await client.readContract({
        address: DIAMOND,
        abi: METOKEN_ABI,
        functionName: 'getMeTokenInfo',
        args: [meTokenAddress as `0x${string}`],
      }) as any;

      const hubId = meTokenInfo.hubId || meTokenInfo[1] || BigInt(1);

      // 2. Get vault address for this hub
      const hubInfo = await client.readContract({
        address: DIAMOND,
        abi: METOKEN_ABI,
        functionName: 'getHubInfo',
        args: [hubId],
      }) as any;

      // Extract vault address (index 6 in the tuple)
      let vaultAddress: string;
      if (Array.isArray(hubInfo)) {
        vaultAddress = hubInfo[6] as string;
      } else if (typeof hubInfo === 'object' && 'vault' in hubInfo) {
        vaultAddress = hubInfo.vault as string;
      } else {
        vaultAddress = (hubInfo as any)[6] || (hubInfo as any).vault;
      }

      // Fallback to Diamond if vault is zero address (shouldn't happen, but safe)
      if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('⚠️ Vault address is zero, falling back to Diamond');
        vaultAddress = DIAMOND;
      }

      console.log('🔍 ensureDaiApproval: Using vault address:', vaultAddress, 'for Hub ID:', hubId.toString());

      const daiContract = getDaiTokenContract('base');
      const requiredAmount = parseEther(collateralAmount);

      // Check current allowance for vault (not Diamond!)
      const currentAllowance = await client.readContract({
        address: daiContract.address as `0x${string}`,
        abi: daiContract.abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, vaultAddress as `0x${string}`],
      }) as bigint;

      console.log('📊 Current DAI allowance for vault:', {
        vaultAddress,
        currentAllowance: currentAllowance.toString(),
        required: requiredAmount.toString(),
        hasEnough: currentAllowance >= requiredAmount,
      });

      // If allowance is insufficient, approve the vault to spend DAI
      if (currentAllowance < requiredAmount) {
        console.log('🔓 Approving DAI for vault...');
        const operation = await client.sendUserOperation({
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

        console.log('⏳ Waiting for approval confirmation...');
        await client.waitForUserOperationTransaction({
          hash: operation.hash,
        });

        console.log('✅ DAI approved for vault');
      } else {
        console.log('✅ Sufficient DAI allowance already exists for vault');
      }
    } catch (err) {
      console.error('Failed to ensure DAI approval:', err);
      throw new Error('Failed to approve DAI spending');
    }
  };

  // Sell MeTokens
  const sellMeTokens = async (meTokenAddress: string, meTokenAmount: string) => {
    if (!address || !user) throw new Error('No wallet connected');
    if (!client) throw new Error('Smart account client not initialized');

    setIsPending(true);
    setIsConfirming(false);
    setTransactionError(null);

    try {
      const operation = await client.sendUserOperation({
        uo: {
          target: DIAMOND,
          data: encodeFunctionData({
            abi: METOKEN_ABI,
            functionName: 'burn',
            args: [meTokenAddress as `0x${string}`, parseEther(meTokenAmount), address as `0x${string}`],
          }),
          value: BigInt(0),
        },
      });

      setIsPending(false);
      setIsConfirming(true);

      const txHash = await client.waitForUserOperationTransaction({
        hash: operation.hash,
      });

      setIsConfirming(false);
      setIsConfirmed(true);

      // Update MeToken data in Supabase via API route (uses service role client)
      const meToken = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);
      if (meToken) {
        // Record the transaction via API route
        try {
          const response = await fetch(`/api/metokens/${meTokenAddress}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_address: address,
              transaction_type: 'burn',
              amount: parseFloat(meTokenAmount),
              transaction_hash: txHash,
              block_number: 0,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to record transaction:', error);
            // Don't throw - transaction succeeded on-chain, just logging failed
          }
        } catch (error) {
          console.error('Error recording transaction:', error);
          // Don't throw - transaction succeeded on-chain, just logging failed
        }

        // Update user balance in Supabase via API route (uses service role client)
        try {
          // Read actual balance from chain to ensure accuracy
          const actualBalance = await client.readContract({
            address: meTokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          }) as bigint;

          const newBalance = parseFloat(formatEther(actualBalance));
          console.log(`📊 Syncing balance to Supabase: ${newBalance} (Chain balance: ${actualBalance.toString()})`);

          const balanceResponse = await fetch(`/api/metokens/${meTokenAddress}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_address: address,
              balance: newBalance,
            }),
          });

          if (!balanceResponse.ok) {
            let errorMsg = 'Unknown error';
            try {
              const errorBody = await balanceResponse.text();
              errorMsg = errorBody;
              try {
                // Try to format JSON for better readability
                errorMsg = JSON.stringify(JSON.parse(errorBody), null, 2);
              } catch { }
            } catch (readErr) {
              errorMsg = `Could not read response body: ${readErr}`;
            }
            console.error(`Failed to update user balance (Status: ${balanceResponse.status}): ${errorMsg}`);
            // Don't throw - transaction succeeded on-chain, just logging failed
          } else {
            console.log('✅ User balance synced to Supabase successfully');
          }
        } catch (error) {
          console.error('Error updating user balance:', error);
          // Don't throw - transaction succeeded on-chain, just logging failed
        }
      }

      setIsConfirming(false);
      setIsConfirmed(true);

      // Refresh data
      await checkUserMeToken();
      return txHash;
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      const error = err instanceof Error ? err : new Error('Failed to sell MeTokens');
      setTransactionError(error);
      throw error;
    }
  };

  // Calculate MeTokens to be minted
  const calculateMeTokensMinted = async (meTokenAddress: string, collateralAmount: string): Promise<string> => {
    try {
      if (!client) return '0';

      const result = await client.readContract({
        address: DIAMOND,
        abi: METOKEN_ABI,
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
      if (!client || !address) {
        console.warn('⚠️ calculateAssetsReturned: Missing client or address', { hasClient: !!client, address });
        return '0';
      }

      console.log('📊 calculateAssetsReturned input:', {
        meTokenAddress,
        meTokenAmount,
        meTokenAmountWei: parseEther(meTokenAmount).toString(),
        senderAddress: address,
        diamondAddress: DIAMOND
      });

      const result = await client.readContract({
        address: DIAMOND,
        abi: METOKEN_ABI,
        functionName: 'calculateAssetsReturned',
        args: [meTokenAddress as `0x${string}`, parseEther(meTokenAmount), address as `0x${string}`],
      });

      const assetsReturned = formatEther(result as bigint);
      console.log('✅ calculateAssetsReturned result:', {
        resultWei: (result as bigint).toString(),
        assetsReturned,
        meTokenAmount
      });

      return assetsReturned;
    } catch (err) {
      console.error('❌ Failed to calculate assets returned:', err);
      console.error('❌ Error details:', {
        meTokenAddress,
        meTokenAmount,
        address,
        error: err instanceof Error ? err.message : String(err)
      });
      return '0';
    }
  };

  // Check for a specific MeToken by address
  const checkSpecificMeToken = async (meTokenAddress: string) => {
    if (!address || !client) return null;

    try {
      const supabaseMeToken = await meTokenSupabaseService.getMeTokenByAddress(meTokenAddress);

      if (supabaseMeToken) {
        const ownerLower = supabaseMeToken.owner_address.toLowerCase();
        const addressLower = address.toLowerCase();
        const eoaLower = user?.address?.toLowerCase();

        // Check if the MeToken belongs to either the current address OR the user's EOA
        if (ownerLower === addressLower || (eoaLower && ownerLower === eoaLower)) {
          console.log('✅ MeToken belongs to user (owner:', supabaseMeToken.owner_address, ')');
          const meTokenData = await convertToMeTokenData(supabaseMeToken, address || '');
          setUserMeToken(meTokenData);
          return meTokenData;
        }

        console.log('❌ MeToken owner mismatch:', {
          meTokenOwner: supabaseMeToken.owner_address,
          profileAddress: address,
          userEOA: user?.address
        });
      }

      return null;
    } catch (err) {
      console.error(`Failed to check MeToken ${meTokenAddress}:`, err);
      return null;
    }
  };

  // Keep a stable reference to checkUserMeToken to avoid infinite re-subscriptions
  const checkUserMeTokenRef = useRef(checkUserMeToken);

  useEffect(() => {
    checkUserMeTokenRef.current = checkUserMeToken;
  }, [checkUserMeToken]);

  // Subscribe to real-time updates (only re-subscribe when address changes)
  useEffect(() => {
    if (!address) return;

    const subscription = meTokenSupabaseService.subscribeToBalanceUpdates(address, (payload) => {
      console.log('Balance update received:', payload);
      // Use the ref to call the latest version without causing re-subscriptions
      checkUserMeTokenRef.current();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [address]); // Only depend on address, not checkUserMeToken

  // Initial fetch when address changes
  useEffect(() => {
    if (address) {
      checkUserMeToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]); // Only run when address changes, not when checkUserMeToken changes

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
    checkUserMeToken, // Expose this function for manual refresh
    isPending,
    isConfirming,
    isConfirmed,
    transactionError,
    getMeTokenVaultAddress: async (meTokenAddress: string) => {
      if (!client) return null;
      try {
        const meTokenInfo = await client.readContract({
          address: DIAMOND,
          abi: METOKEN_ABI,
          functionName: 'getMeTokenInfo',
          args: [meTokenAddress as `0x${string}`],
        });
        const hubId = (meTokenInfo as any).hubId;
        const hubInfo = await client.readContract({
          address: DIAMOND,
          abi: METOKEN_ABI,
          functionName: 'getHubInfo',
          args: [hubId],
        });
        return (hubInfo as any).vault as string;
      } catch (error) {
        console.error('Failed to get vault address:', error);
        return null;
      }
    },
    ensureDaiApproval
  };
}
