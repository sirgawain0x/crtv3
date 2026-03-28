import type { Signer, Identifier } from "@xmtp/browser-sdk";
import { hexToBytes } from "viem";
import { logger } from '@/lib/utils/logger';


/**
 * Creates an XMTP Signer implementation for Account Kit wallets
 * 
 * XMTP requires a Signer interface with:
 * - getIdentifier(): Returns wallet address as identifier
 * - signMessage(message: string): Returns Uint8Array signature
 * 
 * This implementation works with both EOA and Smart Account wallets
 * from Account Kit.
 */
export function createXmtpSigner(
  address: string,
  signMessageFn: (message: string) => Promise<string>
): Signer {
  return {
    type: "EOA",
    getIdentifier: (): Identifier => ({
      identifier: address,
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      try {
        // Sign the message using Account Kit's signMessage
        const signature = await signMessageFn(message);
        
        // XMTP expects Uint8Array, but Account Kit returns hex string
        // Convert hex string to Uint8Array
        // Remove '0x' prefix if present
        const hexString = signature.startsWith("0x") ? signature.slice(2) : signature;
        const bytes = hexToBytes(`0x${hexString}`);
        
        return bytes;
      } catch (error) {
        logger.error("Error signing message for XMTP:", error);
        throw error;
      }
    },
  };
}


