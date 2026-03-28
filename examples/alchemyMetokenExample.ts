/**
 * Example usage of Alchemy MeToken Creation Implementation
 * 
 * This file demonstrates how to use the new Alchemy SDK integration
 * for creating MeTokens with Supabase backend support.
 */

import { alchemyMeTokenService } from '../lib/sdk/alchemy/metoken-service';

// Example 1: Basic MeToken Creation
export async function createBasicMeToken() {
  try {
    console.log('🚀 Creating a basic MeToken...');
    
    const params = {
      name: 'My Creative Token',
      symbol: 'MCT',
      hubId: 1,
      assetsDeposited: '100.00', // 100 DAI
      creatorAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Example address
    };
    
    const result = await alchemyMeTokenService.createMeToken(params);
    
    console.log('✅ MeToken created successfully!');
    console.log('MeToken Address:', result.meTokenAddress);
    console.log('Transaction Hash:', result.transactionHash);
    console.log('MeTokens Minted:', result.meTokensMinted);
    console.log('Hub ID:', result.hubId);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to create MeToken:', error);
    throw error;
  }
}

// Example 2: Check MeToken Information
export async function checkMeTokenInfo(meTokenAddress: string) {
  try {
    console.log('🔍 Checking MeToken information...');
    
    const info = await alchemyMeTokenService.getMeTokenInfo(meTokenAddress);
    
    if (!info) {
      console.log('❌ MeToken not found or failed to retrieve info');
      return null;
    }
    
    console.log('✅ MeToken information retrieved:');
    console.log('Owner:', info.owner);
    console.log('Hub ID:', info.hubId);
    console.log('Balance Pooled:', info.balancePooled);
    console.log('Balance Locked:', info.balanceLocked);
    console.log('Start Time:', new Date(info.startTime * 1000).toISOString());
    console.log('End Time:', info.endTime > 0 ? new Date(info.endTime * 1000).toISOString() : 'N/A');
    
    return info;
  } catch (error) {
    console.error('❌ Failed to get MeToken info:', error);
    throw error;
  }
}

// Example 3: Check DAI Balance and Allowance
export async function checkDaiStatus(userAddress: string) {
  try {
    console.log('💰 Checking DAI balance and allowance...');
    
    const [balance, allowance] = await Promise.all([
      alchemyMeTokenService.getDaiBalance(userAddress),
      alchemyMeTokenService.getDaiAllowance(userAddress),
    ]);
    
    console.log('✅ DAI status:');
    console.log('Balance:', balance, 'DAI');
    console.log('Allowance:', allowance, 'DAI');
    
    return { balance, allowance };
  } catch (error) {
    console.error('❌ Failed to check DAI status:', error);
    throw error;
  }
}

// Example 4: Estimate Gas for MeToken Creation
export async function estimateGasCost() {
  try {
    console.log('⛽ Estimating gas cost for MeToken creation...');
    
    const params = {
      name: 'Gas Test Token',
      symbol: 'GTT',
      hubId: 1,
      assetsDeposited: '50.00',
      creatorAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    };
    
    const gasEstimate = await alchemyMeTokenService.estimateMeTokenCreationGas(params);
    
    console.log('✅ Gas estimation:');
    console.log('Estimated Gas:', gasEstimate.toString());
    
    // Get current gas prices
    const gasPrices = await alchemyMeTokenService.getGasPrices();
    console.log('Current Gas Prices:');
    console.log('Slow:', gasPrices.slow, 'ETH');
    console.log('Standard:', gasPrices.standard, 'ETH');
    console.log('Fast:', gasPrices.fast, 'ETH');
    
    return { gasEstimate, gasPrices };
  } catch (error) {
    console.error('❌ Failed to estimate gas:', error);
    throw error;
  }
}

// Example 5: Check if MeToken is Subscribed
export async function checkSubscriptionStatus(meTokenAddress: string) {
  try {
    console.log('🔍 Checking MeToken subscription status...');
    
    const isSubscribed = await alchemyMeTokenService.isMeTokenSubscribed(meTokenAddress);
    
    console.log('✅ Subscription status:');
    console.log('Is Subscribed:', isSubscribed ? 'Yes' : 'No');
    
    if (isSubscribed) {
      const info = await alchemyMeTokenService.getMeTokenInfo(meTokenAddress);
      if (info) {
        console.log('Hub ID:', info.hubId);
        console.log('Total Liquidity:', (parseFloat(info.balancePooled) + parseFloat(info.balanceLocked)).toFixed(2), 'DAI');
      }
    }
    
    return isSubscribed;
  } catch (error) {
    console.error('❌ Failed to check subscription status:', error);
    throw error;
  }
}

// Example 6: Complete MeToken Creation Workflow
export async function completeMeTokenWorkflow() {
  try {
    console.log('🎯 Starting complete MeToken creation workflow...\n');
    
    const userAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'; // Example address
    
    // Step 1: Check DAI status
    console.log('Step 1: Checking DAI status...');
    const daiStatus = await checkDaiStatus(userAddress);
    
    if (parseFloat(daiStatus.balance) < 100) {
      console.log('⚠️  Insufficient DAI balance. Please fund your wallet with at least 100 DAI.');
      return;
    }
    
    // Step 2: Estimate gas
    console.log('\nStep 2: Estimating gas cost...');
    const gasInfo = await estimateGasCost();
    
    // Step 3: Create MeToken
    console.log('\nStep 3: Creating MeToken...');
    const result = await createBasicMeToken();
    
    // Step 4: Verify creation
    console.log('\nStep 4: Verifying MeToken creation...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for blockchain confirmation
    
    const info = await checkMeTokenInfo(result.meTokenAddress);
    
    // Step 5: Check subscription status
    console.log('\nStep 5: Checking subscription status...');
    const isSubscribed = await checkSubscriptionStatus(result.meTokenAddress);
    
    console.log('\n🎉 MeToken creation workflow completed successfully!');
    console.log('Summary:');
    console.log('- MeToken Address:', result.meTokenAddress);
    console.log('- Transaction Hash:', result.transactionHash);
    console.log('- Hub ID:', result.hubId);
    console.log('- Is Subscribed:', isSubscribed ? 'Yes' : 'No');
    
    return {
      meTokenAddress: result.meTokenAddress,
      transactionHash: result.transactionHash,
      hubId: result.hubId,
      isSubscribed,
      info,
    };
  } catch (error) {
    console.error('❌ MeToken creation workflow failed:', error);
    throw error;
  }
}

// Example 7: Frontend Integration Example
export function frontendIntegrationExample() {
  return `
// React component example
import { AlchemyMeTokenCreator } from '@/components/UserProfile/AlchemyMeTokenCreator';

function MyMeTokenPage() {
  const handleMeTokenCreated = (meTokenAddress: string, transactionHash: string) => {
    console.log('MeToken created:', { meTokenAddress, transactionHash });
    
    // Redirect to MeToken page
    router.push(\`/metoken/\${meTokenAddress}\`);
    
    // Show success notification
    toast({
      title: "MeToken Created!",
      description: \`Your MeToken has been created successfully.\`,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Your MeToken</h1>
      <AlchemyMeTokenCreator onMeTokenCreated={handleMeTokenCreated} />
    </div>
  );
}
  `;
}

// Example 8: API Integration Example
export function apiIntegrationExample() {
  return `
// API call example
async function createMeTokenViaAPI(meTokenData) {
  try {
    const response = await fetch('/api/metokens/alchemy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${userToken}\`,
      },
      body: JSON.stringify({
        name: meTokenData.name,
        symbol: meTokenData.symbol,
        hubId: meTokenData.hubId,
        assetsDeposited: meTokenData.assetsDeposited,
        creatorAddress: meTokenData.creatorAddress,
        transactionHash: meTokenData.transactionHash, // From client-side creation
      }),
    });

    if (!response.ok) {
      throw new Error(\`API call failed: \${response.statusText}\`);
    }

    const result = await response.json();
    console.log('MeToken stored in database:', result);
    return result;
  } catch (error) {
    console.error('Failed to store MeToken:', error);
    throw error;
  }
}
  `;
}

// Export all examples
export const examples = {
  createBasicMeToken,
  checkMeTokenInfo,
  checkDaiStatus,
  estimateGasCost,
  checkSubscriptionStatus,
  completeMeTokenWorkflow,
  frontendIntegrationExample,
  apiIntegrationExample,
};

// Run example if this file is executed directly
if (require.main === module) {
  console.log('🚀 Running Alchemy MeToken examples...\n');
  
  // Run the complete workflow example
  completeMeTokenWorkflow()
    .then((result) => {
      console.log('\n✅ Example completed successfully!');
      console.log('Result:', result);
    })
    .catch((error) => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
}
