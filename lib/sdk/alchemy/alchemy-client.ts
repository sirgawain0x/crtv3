import { Alchemy, Network } from "alchemy-sdk";
import { getAlchemyApiKey } from "@/lib/web3/alchemy-key";

// Server traffic uses the private key; the browser gets the public key.
const settings = {
  apiKey: getAlchemyApiKey(),
  network: Network.BASE_MAINNET,
};

export const alchemyClient = new Alchemy(settings);
