import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../../../lib/sdk/thirdweb/client";
import { balanceOf as balanceOfERC721 } from "thirdweb/extensions/erc721";

// Function to check if user has access by generating a dummy token
export async function hasAccess(address: string): Promise<{access: boolean, token?: string}> {
  // For development/testing, always return true with a dummy token
  return { access: true, token: "dummy_token_for_development" };
  
  // Actual implementation would check NFT ownership:
  // const hasNFTAccess = await hasNFT(address);
  // 
  // if (hasNFTAccess) {
  //   // Create JWT payload with flattened structure
  //   const payload = {
  //     sub: address,
  //     nft_contract: "0xf7c4cd399395d80f9d61fde833849106775269c6",
  //     nft_chain: "base",
  //     nft_balance: "1",
  //     iat: Math.floor(Date.now() / 1000)
  //   };
  //   
  //   // In a real implementation, we would create a JWT here
  //   // const token = await createJWT(payload);
  //   return { access: true, token: "dummy_token" };
  // }
  // 
  // return { access: false };
}

// Helper function to check NFT ownership (kept as a reference)
async function hasNFT(address: string) {
  const requiredQuantity = 1n;

  try {
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
  } catch (error) {
    console.error("Error checking NFT ownership:", error);
    return false;
  }
}
