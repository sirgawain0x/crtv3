import { Alchemy, Network } from "alchemy-sdk";

const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;

const settings = {
  apiKey,
  network: Network.BASE_MAINNET,
};

export const alchemyClient = new Alchemy(settings);
