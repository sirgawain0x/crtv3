/**
 * Format Account Kit signatures to standard ECDSA format using Alchemy's wallet_formatSign API
 * 
 * Account Kit returns wrapped signatures for smart accounts. This function converts them
 * to standard 65-byte ECDSA signatures that can be verified by services like Snapshot.
 */

import { serverLogger } from "@/lib/utils/logger";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

interface FormatSignatureParams {
  from: string; // The address that signed
  chainId: number; // Chain ID (e.g., 8453 for Base)
  signature: string; // The raw signature from Account Kit
}

interface FormatSignatureResult {
  signature: string;
}

/**
 * Format a signature using Alchemy's wallet_formatSign API
 * 
 * @param params - The parameters for formatting
 * @returns The formatted signature in standard ECDSA format
 */
export async function formatSignature(params: FormatSignatureParams): Promise<string> {
  if (!ALCHEMY_API_KEY) {
    serverLogger.warn("No Alchemy API key found, returning original signature");
    return params.signature;
  }

  const url = `https://api.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  
  // Convert chainId to hex string
  const chainIdHex = `0x${params.chainId.toString(16)}`;
  
  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "wallet_formatSign",
    params: [
      {
        from: params.from,
        chainId: chainIdHex,
        signature: {
          type: "ecdsa",
          data: params.signature,
        },
      },
    ],
  };

  serverLogger.debug("Calling wallet_formatSign API...", {
    from: params.from,
    chainId: chainIdHex,
    signatureLength: params.signature.length,
    signaturePrefix: params.signature.substring(0, 20) + "...",
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      serverLogger.error("wallet_formatSign API error:", response.status, errorText);
      throw new Error(`wallet_formatSign failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      serverLogger.error("wallet_formatSign RPC error:", result.error);
      throw new Error(`wallet_formatSign RPC error: ${JSON.stringify(result.error)}`);
    }

    const formattedSignature = result.result?.signature;
    
    if (!formattedSignature) {
      serverLogger.error("No signature in wallet_formatSign response:", result);
      throw new Error("No signature returned from wallet_formatSign");
    }

    serverLogger.debug("✅ wallet_formatSign success!", {
      originalLength: params.signature.length,
      formattedLength: formattedSignature.length,
      formattedPrefix: formattedSignature.substring(0, 20) + "...",
    });

    return formattedSignature;
  } catch (error) {
    serverLogger.error("Failed to format signature:", error);
    // Return original signature as fallback
    serverLogger.warn("Returning original signature as fallback");
    return params.signature;
  }
}
