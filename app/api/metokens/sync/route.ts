import { NextRequest, NextResponse } from 'next/server';
import { meTokenSupabaseService } from '@/lib/sdk/supabase/metokens';
import { meTokensSubgraph } from '@/lib/sdk/metokens/subgraph';
import { 
  extractMeTokenAddressFromTransaction, 
  getMeTokenInfoFromBlockchain, 
  getMeTokenProtocolInfo 
} from '@/lib/utils/metokenUtils';

// POST /api/metokens/sync - Sync a MeToken from blockchain to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionHash, meTokenAddress } = body;

    console.log('📥 Sync request:', { transactionHash, meTokenAddress });

    if (!transactionHash && !meTokenAddress) {
      return NextResponse.json(
        { error: 'Either transactionHash or meTokenAddress is required' },
        { status: 400 }
      );
    }

    let targetMeTokenAddress = meTokenAddress;

    // If we have a transaction hash, extract the MeToken address from it
    if (transactionHash && !meTokenAddress) {
      targetMeTokenAddress = await extractMeTokenAddressFromTransaction(transactionHash);
      
      if (!targetMeTokenAddress) {
        return NextResponse.json(
          { error: 'Could not extract MeToken address from transaction' },
          { status: 400 }
        );
      }
    }

    if (!targetMeTokenAddress) {
      return NextResponse.json(
        { error: 'MeToken address is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Target MeToken address:', targetMeTokenAddress);

    // Check if MeToken already exists in database
    const existingMeToken = await meTokenSupabaseService.getMeTokenByAddress(targetMeTokenAddress);
    if (existingMeToken) {
      console.log('✅ MeToken already in database');
      return NextResponse.json(
        { 
          message: 'MeToken already exists in database',
          data: existingMeToken 
        },
        { status: 200 }
      );
    }

    // First, check if the MeToken exists in the subgraph
    console.log('📊 Checking subgraph for MeToken...');
    const subgraphData = await meTokensSubgraph.checkMeTokenExists(targetMeTokenAddress);
    
    if (!subgraphData) {
      console.log('⚠️ MeToken not found in subgraph - may not be registered yet');
      return NextResponse.json(
        { error: 'MeToken not found in subgraph. It may not be registered yet or the subgraph may not be synced.' },
        { status: 404 }
      );
    }

    console.log('✅ Found MeToken in subgraph, fetching blockchain data...');

    // Get MeToken information from blockchain
    // Note: For newly created MeTokens, the Diamond might not be fully synced yet
    // So we'll be lenient and use default values if needed
    let tokenInfo, protocolInfo;
    
    try {
      [tokenInfo, protocolInfo] = await Promise.all([
        getMeTokenInfoFromBlockchain(targetMeTokenAddress),
        getMeTokenProtocolInfo(targetMeTokenAddress)
      ]);
    } catch (error) {
      console.warn('⚠️ Failed to get full blockchain data, using subgraph data:', error);
    }

    if (!tokenInfo) {
      console.warn('⚠️ Token info not available from blockchain, using defaults from subgraph');
      // Use data from subgraph if available
      tokenInfo = {
        name: 'MeToken', // Will be updated when protocol syncs
        symbol: 'ME',
        totalSupply: '0',
        owner: subgraphData?.id || targetMeTokenAddress // Use MeToken address as fallback
      };
    }

    if (!protocolInfo) {
      console.warn('⚠️ Protocol info not available from blockchain, using defaults');
      protocolInfo = {
        hubId: parseInt(subgraphData?.hubId || '1'),
        balancePooled: subgraphData?.assetsDeposited || '0',
        balanceLocked: '0',
        startTime: 0,
        endTime: 0,
        endCooldown: 0,
        targetHubId: 0,
        migration: ''
      };
    }

    console.log('✅ Got blockchain data:', { tokenInfo, protocolInfo });

    // Calculate TVL (Total Value Locked)
    const balancePooled = BigInt(protocolInfo.balancePooled);
    const balanceLocked = BigInt(protocolInfo.balanceLocked);
    const totalBalance = balancePooled + balanceLocked;
    
    // For now, we'll assume 1 unit = $1 (in production, you'd use an oracle)
    const tvl = Number(totalBalance) / 1e18; // Convert from wei to ether

    // Create MeToken data for database
    const meTokenData = {
      address: targetMeTokenAddress.toLowerCase(),
      owner_address: tokenInfo.owner.toLowerCase(),
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      total_supply: Number(tokenInfo.totalSupply) / 1e18, // Convert from wei to ether
      tvl: tvl,
      hub_id: protocolInfo.hubId,
      balance_pooled: Number(protocolInfo.balancePooled) / 1e18,
      balance_locked: Number(protocolInfo.balanceLocked) / 1e18,
      start_time: protocolInfo.startTime > 0 ? new Date(protocolInfo.startTime * 1000).toISOString() : undefined,
      end_time: protocolInfo.endTime > 0 ? new Date(protocolInfo.endTime * 1000).toISOString() : undefined,
      end_cooldown: protocolInfo.endCooldown > 0 ? new Date(protocolInfo.endCooldown * 1000).toISOString() : undefined,
      target_hub_id: protocolInfo.targetHubId > 0 ? protocolInfo.targetHubId : undefined,
      migration_address: protocolInfo.migration !== '0x0000000000000000000000000000000000000000' ? protocolInfo.migration : undefined,
    };

    // Create the MeToken in the database
    const result = await meTokenSupabaseService.createMeToken(meTokenData);

    // Record the creation transaction if we have a transaction hash
    if (transactionHash) {
      try {
        await meTokenSupabaseService.recordTransaction({
          metoken_id: result.id,
          user_address: tokenInfo.owner.toLowerCase(),
          transaction_type: 'create',
          amount: 0,
          transaction_hash: transactionHash,
          block_number: 0, // We could get this from the transaction receipt if needed
        });
      } catch (error) {
        console.error('Failed to record creation transaction:', error);
        // Don't fail the whole operation if we can't record the transaction
      }
    }

    return NextResponse.json({ 
      message: 'MeToken synced successfully',
      data: result 
    }, { status: 201 });

  } catch (error) {
    console.error('Error syncing MeToken:', error);
    return NextResponse.json(
      { error: 'Failed to sync MeToken', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
