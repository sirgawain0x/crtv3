import { NextRequest, NextResponse } from 'next/server';
import { executeSwap } from '@/lib/sdk/alchemy/swap-client';
import { BASE_TOKENS } from '@/lib/sdk/alchemy/swap-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromToken, toToken, fromAmount, minimumToAmount } = body;

    console.log('Swap request received:', { fromToken, toToken, fromAmount, minimumToAmount });

    // Validate required fields
    if (!fromToken || !toToken || !fromAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: fromToken, toToken, fromAmount' },
        { status: 400 }
      );
    }

    // Validate token symbols
    const validTokens = Object.keys(BASE_TOKENS) as Array<keyof typeof BASE_TOKENS>;
    if (!validTokens.includes(fromToken) || !validTokens.includes(toToken)) {
      return NextResponse.json(
        { error: 'Invalid token symbols' },
        { status: 400 }
      );
    }

    // Check environment variables
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    const policyId = process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID;
    const privateKey = process.env.ALCHEMY_SWAP_PRIVATE_KEY;

    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      hasPolicyId: !!policyId,
      hasPrivateKey: !!privateKey,
      apiKeyPrefix: apiKey ? apiKey.slice(0, 10) + '...' : 'MISSING',
    });

    if (!apiKey) {
      console.error('Missing NEXT_PUBLIC_ALCHEMY_API_KEY');
      return NextResponse.json(
        { error: 'Alchemy API key not configured. Please set NEXT_PUBLIC_ALCHEMY_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    if (!policyId) {
      console.error('Missing NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID');
      return NextResponse.json(
        { error: 'Alchemy paymaster policy ID not configured. Please set NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID environment variable.' },
        { status: 500 }
      );
    }

    if (!privateKey) {
      console.error('Missing ALCHEMY_SWAP_PRIVATE_KEY');
      return NextResponse.json(
        { error: 'Alchemy swap private key not configured. Please set ALCHEMY_SWAP_PRIVATE_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Execute the swap
    console.log('Executing swap with params:', {
      fromToken: BASE_TOKENS[fromToken],
      toToken: BASE_TOKENS[toToken],
      fromAmount,
      minimumToAmount,
    });

    const result = await executeSwap({
      fromToken: BASE_TOKENS[fromToken],
      toToken: BASE_TOKENS[toToken],
      fromAmount,
      minimumToAmount,
    });

    console.log('Swap executed successfully:', result);

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
    });

  } catch (error) {
    console.error('Swap execution error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Swap execution failed',
        success: false,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
