import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      hasApiKey: !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
      hasPolicyId: !!process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID,
      hasPrivateKey: !!process.env.ALCHEMY_SWAP_PRIVATE_KEY,
      apiKeyPrefix: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
        ? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY.slice(0, 10) + '...' 
        : 'MISSING',
      policyIdPrefix: process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID 
        ? process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID.slice(0, 10) + '...' 
        : 'MISSING',
      privateKeyPrefix: process.env.ALCHEMY_SWAP_PRIVATE_KEY 
        ? process.env.ALCHEMY_SWAP_PRIVATE_KEY.slice(0, 10) + '...' 
        : 'MISSING',
    };

    console.log('Environment debug check:', envCheck);

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment variables check completed'
    });

  } catch (error) {
    console.error('Environment debug error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Environment debug failed',
        success: false 
      },
      { status: 500 }
    );
  }
}
