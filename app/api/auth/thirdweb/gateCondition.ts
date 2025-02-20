import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "../../../lib/sdk/thirdweb/client";
import { balanceOf as balanceOfERC721 } from "thirdweb/extensions/erc721";

export async function hasAccess(address: string): Promise<boolean> {
  return await hasNFT(address);
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
