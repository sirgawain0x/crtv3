import { signer } from "./signer";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "@/lib/utils/chains/base";
import { getAlchemyApiKey } from "@/lib/web3/alchemy-key";

export const walletClient = createWalletClient({
  transport: http(
    `https://base-sepolia.g.alchemy.com/v2/${getAlchemyApiKey()}`
  ),
  chain: baseSepolia,
  account: signer.instance.toViemAccount(),
});
