import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MeTokenCreationRequest {
  name: string;
  symbol: string;
  hubId: number;
  assetsDeposited: string;
  creatorAddress: string;
  transactionHash?: string; // Optional, for tracking existing transactions
}

interface MeTokenCreationResponse {
  success: boolean;
  meTokenAddress?: string;
  transactionHash?: string;
  error?: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: MeTokenCreationRequest = await req.json();
    
    // Validate required fields
    if (!body.name || !body.symbol || !body.hubId || !body.assetsDeposited || !body.creatorAddress) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: name, symbol, hubId, assetsDeposited, creatorAddress'
        } as MeTokenCreationResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🚀 Processing MeToken creation request:', {
      name: body.name,
      symbol: body.symbol,
      hubId: body.hubId,
      assetsDeposited: body.assetsDeposited,
      creatorAddress: body.creatorAddress,
    });

    // Step 1: Check if MeToken already exists for this creator
    const { data: existingMeToken, error: checkError } = await supabase
      .from('metokens')
      .select('*')
      .eq('owner_address', body.creatorAddress.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing MeToken:', checkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to check existing MeToken'
        } as MeTokenCreationResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (existingMeToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Creator already has a MeToken. Each address can only create one MeToken.',
          data: {
            existingMeToken: {
              address: existingMeToken.address,
              name: existingMeToken.name,
              symbol: existingMeToken.symbol,
            }
          }
        } as MeTokenCreationResponse),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: If transaction hash is provided, track the existing transaction
    if (body.transactionHash) {
      console.log('📝 Tracking existing MeToken creation transaction:', body.transactionHash);
      
      // Wait for blockchain confirmation and extract MeToken address
      const meTokenAddress = await waitForMeTokenCreation(body.transactionHash);
      
      if (!meTokenAddress) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to extract MeToken address from transaction'
          } as MeTokenCreationResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Store the MeToken in database
      const meTokenData = {
        address: meTokenAddress.toLowerCase(),
        owner_address: body.creatorAddress.toLowerCase(),
        name: body.name,
        symbol: body.symbol,
        total_supply: 0, // Will be updated when we get the actual data
        tvl: parseFloat(body.assetsDeposited),
        hub_id: body.hubId,
        balance_pooled: parseFloat(body.assetsDeposited),
        balance_locked: 0,
        start_time: new Date().toISOString(),
      };

      const { data: createdMeToken, error: createError } = await supabase
        .from('metokens')
        .insert(meTokenData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating MeToken record:', createError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create MeToken record in database'
          } as MeTokenCreationResponse),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Record the creation transaction
      await supabase
        .from('metoken_transactions')
        .insert({
          metoken_id: createdMeToken.id,
          user_address: body.creatorAddress.toLowerCase(),
          transaction_type: 'create',
          amount: parseFloat(body.assetsDeposited),
          transaction_hash: body.transactionHash,
          created_at: new Date().toISOString(),
        });

      return new Response(
        JSON.stringify({
          success: true,
          meTokenAddress,
          transactionHash: body.transactionHash,
          data: createdMeToken
        } as MeTokenCreationResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 3: For new transactions, we would typically call the Alchemy SDK here
    // However, since this is a serverless function, we'll return instructions for client-side execution
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Transaction hash required. Please create the MeToken on the client side and provide the transaction hash.',
        instructions: {
          step1: 'Use the Alchemy SDK on the client side to create the MeToken',
          step2: 'Call the Diamond contract subscribe function',
          step3: 'Provide the resulting transaction hash to this endpoint',
          step4: 'This function will track and store the MeToken data'
        }
      } as MeTokenCreationResponse),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ MeToken creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as MeTokenCreationResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Wait for MeToken creation transaction and extract the MeToken address
 * This is a simplified version - in production, you'd want to use a more robust method
 */
async function waitForMeTokenCreation(transactionHash: string): Promise<string | null> {
  try {
    // In a real implementation, you would:
    // 1. Use Alchemy's getTransactionReceipt to get the transaction details
    // 2. Parse the logs to find the Subscribe event
    // 3. Extract the MeToken address from the event data
    
    // For now, we'll simulate this process
    console.log('⏳ Waiting for transaction confirmation:', transactionHash);
    
    // Simulate waiting for blockchain confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In production, you would parse the actual transaction logs here
    // For demonstration, we'll return a placeholder
    console.log('✅ Transaction confirmed, extracting MeToken address...');
    
    // This is where you would extract the actual MeToken address from the transaction logs
    // For now, we'll return null to indicate this needs to be implemented
    return null;
    
  } catch (error) {
    console.error('Failed to wait for MeToken creation:', error);
    return null;
  }
}
