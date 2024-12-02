import { getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "../../../lib/sdk/thirdweb/client";
import { balanceOf as balanceOfERC721 } from "thirdweb/extensions/erc721";

export async function hasAccess(address: string): Promise<boolean> {
  return await hasNFT(address);
}

async function hasNFT(address: string) {
  const requiredQuantity = 1n;

  const creatorPassAnnual = getContract({
    address: "0xad597e5b24ad2a6032168c76f49f05d957223cd0",
    chain: polygon,
    client,
  });

  const creatorPassAnnualBalance = await balanceOfERC721({
    contract: creatorPassAnnual,
    owner: address,
  });

  const creatorPass3Month = getContract({
    address: "0xb6b645c3e2025cf69983983266d16a0aa323e2b0",
    chain: polygon,
    client,
  });

  const creatorPass3MonthBalance = await balanceOfERC721({
    contract: creatorPass3Month,
    owner: address,
  });

  const hasPass: boolean =  (creatorPassAnnualBalance + creatorPass3MonthBalance) >= requiredQuantity;
  
  return hasPass;
}
