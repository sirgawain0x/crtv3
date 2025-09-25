import { erc20Abi } from "viem";

export const DAI_TOKEN_ADDRESSES = {
  base: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI on Base
  optimism: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI on Optimism
  // Add more chains as needed
} as const;

export const DAI_TOKEN_SYMBOL = "DAI";
export const DAI_TOKEN_DECIMALS = 18;

export function getDaiTokenContract(chain: keyof typeof DAI_TOKEN_ADDRESSES) {
  return {
    address: DAI_TOKEN_ADDRESSES[chain],
    abi: erc20Abi,
    symbol: DAI_TOKEN_SYMBOL,
    decimals: DAI_TOKEN_DECIMALS,
  } as const;
}
