import { createJWT } from '../utils/jwt';
import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../../../lib/sdk/thirdweb/client";
import { balanceOf as balanceOfERC721 } from "thirdweb/extensions/erc721";

export async function hasAccess(address: string): Promise<{access: boolean, token?: string}> {
  const hasNFTAccess = await hasNFT(address);
  
  if (hasNFTAccess) {
    // Create JWT payload
    const payload = {
      sub: address,
      nft_holdings: {
        contract: "0xf7c4cd399395d80f9d61fde833849106775269c6",
        chain: "base",
        balance: "1"
      }
    };
    
    const token = await createJWT(payload);
    return { access: true, token };
  }
  
  return { access: false };
}

async function hasNFT(address: string) {
  const requiredQuantity = 1n;

  const creatorPassAnnual = getContract({
    address: "0xf7c4cd399395d80f9d61fde833849106775269c6",
    chain: base,
    client,
  });

  const creatorPassAnnualBalance = await balanceOfERC721({
    contract: creatorPassAnnual,
    owner: address,
  });

  const hasPass: boolean = creatorPassAnnualBalance >= requiredQuantity;
  
  return hasPass;
}
