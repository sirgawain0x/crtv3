import signJwt from '../utils/jwt';
import { getContract } from 'thirdweb/contract';
import { base } from 'thirdweb/chains';
import { client } from '@app/lib/sdk/thirdweb/client';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize the client using createThirdwebClient

export async function hasAccess(
  address: string,
): Promise<{ access: boolean; token?: string }> {
  const hasNFTAccess = await hasNFT(address);

  if (hasNFTAccess) {
    const payload = {
      sub: address,
      nft_holdings: {
        contract: '0xf7c4cd399395d80f9d61fde833849106775269c6',
        chain: 'base',
        balance: '1',
      },
    };

    const token = await signJwt(payload);
    return { access: true, token };
  }

  return { access: false };
}

async function hasNFT(address: string): Promise<boolean> {
  const requiredQuantity = 1n;

  const creatorPassAnnual = getContract({
    address: '0xf7c4cd399395d80f9d61fde833849106775269c6',
    chain: base,
    client,
  });

  try {
    // Import balanceOf directly from the ERC721 extensions
    const { balanceOf } = await import('thirdweb/extensions/erc721');

    const creatorPassAnnualBalance = await balanceOf({
      contract: creatorPassAnnual,
      owner: address,
    });

    return creatorPassAnnualBalance >= requiredQuantity;
  } catch (error) {
    console.error('Error checking NFT balance:', error);
    throw new Error('Error checking NFT balance');
  }
}
