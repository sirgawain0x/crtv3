import { PublicClient, testnet, mainnet } from "@lens-protocol/client";

const lensEnv = process.env.NEXT_PUBLIC_LENS_ENV === "production" ? mainnet : testnet;

/**
 * Creates a Lens Public Client.
 * 
 * @param apiKey - Optional Server API Key for server-side context.
 *                 NEVER pass this in client-side code.
 * @returns PublicClient
 */
export const createLensClient = (apiKey?: string) => {
    return PublicClient.create({
        environment: lensEnv,
        ...(apiKey && { apiKey }),
    });
};

/**
 * Default client for general usage (no privileged access)
 */
export const publicClient = createLensClient();
