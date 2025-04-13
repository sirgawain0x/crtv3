'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getAddress } from 'viem';
import { verifyJWT } from '@app/lib/auth/jwt';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function GET(request: NextRequest) {
  try {
    const jwt = request.cookies.get('jwt');
    if (!jwt) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const payload = await verifyJWT(jwt.value);
    const address = getAddress(payload.address);

    // Check NFT balance
    const balance = await publicClient.readContract({
      address: '0x13b818daf7016b302383737ba60c3a39fef231cf',
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address],
    });

    if (balance === 0n) {
      return new NextResponse('Unauthorized - No NFT', { status: 401 });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Token gate error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
