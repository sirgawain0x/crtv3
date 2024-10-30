import { getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { client } from "../../../lib/sdk/thirdweb/client";
import { balanceOf as balanceOfERC721 } from "thirdweb/extensions/erc721";

export async function hasAccess(address: string): Promise<boolean> {
  return await hasCreatorPassNFT(address);
}

/**
 * Check out some of the examples below
 * The use cases are not limited to token-balance, you can basically do anything you want.
 *
 * For example: You can leverage some third-party api to check for the "age" of the wallet and
 * only allow wallet older than 2 years to access.
 *
 * Or you can allow only wallets that have interacted with Uniswap to access the page!
 *
 * The sky is the limit.
 */
async function hasCreatorPassNFT(address: string) {
  const requiredQuantity = 1n;

  const creatorPassAnnual = getContract({
    // replace with your own NFT contract address
    address: "0xad597e5b24ad2a6032168c76f49f05d957223cd0",

    // replace with the chain that your nft contract was deployed on
    // if that chain isn't included in our default list, use `defineChain`
    chain: polygon,

    client,
  });

  const creatorPassAnnualBalance = await balanceOfERC721({
    contract: creatorPassAnnual,
    owner: address,
  });

  const creatorPass3Month = getContract({
    // replace with your own NFT contract address
    address: "0xb6b645c3e2025cf69983983266d16a0aa323e2b0",

    // replace with the chain that your nft contract was deployed on
    // if that chain isn't included in our default list, use `defineChain`
    chain: polygon,

    client,
  });

  const creatorPass3MonthBalance = await balanceOfERC721({
    contract: creatorPass3Month,
    owner: address,
  });

  console.log({ creatorPassAnnualBalance, creatorPass3MonthBalance });

  return (creatorPassAnnualBalance + creatorPass3MonthBalance) >= requiredQuantity;
}
