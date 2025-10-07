#!/usr/bin/env tsx

/**
 * Script to sync a MeToken from blockchain to database
 * Usage: yarn tsx scripts/sync-metoken.ts <transaction-hash>
 */

import { extractMeTokenAddressFromTransaction, getMeTokenInfoFromBlockchain, getMeTokenProtocolInfo } from '../lib/utils/metokenUtils';

async function syncMeToken(transactionHash: string) {
  console.log(`🔍 Extracting MeToken address from transaction: ${transactionHash}`);
  
  try {
    // Extract the MeToken address from the transaction
    const meTokenAddress = await extractMeTokenAddressFromTransaction(transactionHash);
    
    if (!meTokenAddress) {
      console.error('❌ Could not extract MeToken address from transaction');
      return;
    }
    
    console.log(`✅ MeToken address found: ${meTokenAddress}`);
    
    // Get MeToken information from blockchain
    console.log('📊 Fetching MeToken information from blockchain...');
    const [tokenInfo, protocolInfo] = await Promise.all([
      getMeTokenInfoFromBlockchain(meTokenAddress),
      getMeTokenProtocolInfo(meTokenAddress)
    ]);
    
    if (!tokenInfo) {
      console.error('❌ Could not retrieve MeToken information from blockchain');
      return;
    }
    
    if (!protocolInfo) {
      console.error('❌ Could not retrieve MeToken protocol information from blockchain');
      return;
    }
    
    console.log('📋 MeToken Information:');
    console.log(`  Name: ${tokenInfo.name}`);
    console.log(`  Symbol: ${tokenInfo.symbol}`);
    console.log(`  Owner: ${tokenInfo.owner}`);
    console.log(`  Total Supply: ${tokenInfo.totalSupply}`);
    console.log(`  Hub ID: ${protocolInfo.hubId}`);
    console.log(`  Balance Pooled: ${protocolInfo.balancePooled}`);
    console.log(`  Balance Locked: ${protocolInfo.balanceLocked}`);
    
    // Calculate TVL
    const balancePooled = BigInt(protocolInfo.balancePooled);
    const balanceLocked = BigInt(protocolInfo.balanceLocked);
    const totalBalance = balancePooled + balanceLocked;
    const tvl = Number(totalBalance) / 1e18;
    
    console.log(`  TVL: $${tvl.toFixed(2)}`);
    
    // Prepare data for API call
    const meTokenData = {
      transactionHash,
      meTokenAddress
    };
    
    console.log('🔄 Syncing to database...');
    
    // Call the sync API endpoint
    const response = await fetch('http://localhost:3000/api/metokens/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meTokenData),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ MeToken synced successfully to database!');
      console.log('📄 Database record:', JSON.stringify(result.data, null, 2));
    } else {
      console.error('❌ Failed to sync MeToken to database:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error syncing MeToken:', error);
  }
}

// Get transaction hash from command line arguments
const transactionHash = process.argv[2];

if (!transactionHash) {
  console.error('❌ Please provide a transaction hash as an argument');
  console.log('Usage: yarn tsx scripts/sync-metoken.ts <transaction-hash>');
  process.exit(1);
}

// Validate transaction hash format
if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
  console.error('❌ Invalid transaction hash format');
  process.exit(1);
}

console.log('🚀 Starting MeToken sync process...');
syncMeToken(transactionHash);
