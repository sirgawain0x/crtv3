/**
 * API Route for Story Protocol IP Token Transfer
 * 
 * This API route handles Story Protocol native IP token transfers using a private key
 * since Story Protocol only supports eth_sendRawTransaction (not eth_sendTransaction).
 * 
 * IMPORTANT: Requires STORY_PROTOCOL_PRIVATE_KEY environment variable
 * This should be a private key for a wallet that has IP tokens on Story Protocol
 */

import { NextRequest, NextResponse } from "next/server";
import { createStoryPublicClient } from "@/lib/sdk/story/client";
import { createWalletClient, http, formatEther, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromAddress, toAddress, amount } = body;

    // Validate required fields
    if (!fromAddress || !toAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: fromAddress, toAddress, and amount are required" },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!/^0x[a-fA-F0-9]{40}$/.test(fromAddress) || !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Story Protocol requires transactions to be signed locally (eth_sendRawTransaction)
    const privateKey = process.env.STORY_PROTOCOL_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json(
        { 
          error: "Story Protocol private key not configured",
          hint: "Set STORY_PROTOCOL_PRIVATE_KEY environment variable. " +
                "This should be the private key for a wallet that has IP tokens on Story Protocol."
        },
        { status: 500 }
      );
    }

    // Verify the private key matches the fromAddress
    // IMPORTANT: For smart accounts (contract wallets), the private key must be for the owner
    // that controls the smart account, OR the private key must be for an EOA that has the IP tokens
    let keyAddress: string;
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      keyAddress = await account.address;
      
      if (keyAddress.toLowerCase() !== fromAddress.toLowerCase()) {
        // Check if fromAddress is a contract (smart account)
        const publicClient = createStoryPublicClient();
        const code = await publicClient.getBytecode({ address: fromAddress as Address });
        const isContract = code && code !== "0x";
        
        if (isContract) {
          return NextResponse.json(
            { 
              error: "Cannot transfer from smart account using private key",
              hint: `The fromAddress (${fromAddress}) is a smart account (contract wallet). ` +
                    `To transfer IP tokens from a smart account, you need to use the smart account's execute function. ` +
                    `However, Story Protocol only supports eth_sendRawTransaction, which requires local signing. ` +
                    `The private key (${keyAddress}) must match the smart account address, or you need to transfer ` +
                    `the IP tokens to an EOA wallet first, then transfer from there.`
            },
            { status: 400 }
          );
        } else {
          // fromAddress is an EOA, but private key doesn't match
          return NextResponse.json(
            { 
              error: "Private key address doesn't match fromAddress",
              hint: `The private key address (${keyAddress}) doesn't match the fromAddress (${fromAddress}). ` +
                    `The private key must be for the wallet that owns the IP tokens you want to transfer.`
            },
            { status: 400 }
          );
        }
      }
    } catch (e) {
      console.error("Could not verify private key address:", e);
      return NextResponse.json(
        { 
          error: "Invalid private key",
          hint: "The STORY_PROTOCOL_PRIVATE_KEY environment variable contains an invalid private key."
        },
        { status: 500 }
      );
    }

    // Get Story Protocol RPC URL and network
    // IMPORTANT: For transactions, we MUST use public RPC endpoints
    // because Alchemy RPC doesn't support eth_sendTransaction (only eth_sendRawTransaction)
    const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
    let rpcUrl = process.env.NEXT_PUBLIC_STORY_RPC_URL;
    
    // If using Alchemy RPC, force use of public RPC for transactions
    if (rpcUrl && rpcUrl.includes('alchemy.com')) {
      console.warn("⚠️ Alchemy RPC doesn't support eth_sendTransaction for Story Protocol. Using public RPC for transactions.");
      rpcUrl = network === "mainnet" 
        ? "https://rpc.story.foundation" 
        : "https://rpc.aeneid.story.foundation";
    } else if (!rpcUrl) {
      // Default to public RPC if no custom URL provided
      rpcUrl = network === "mainnet" 
        ? "https://rpc.story.foundation" 
        : "https://rpc.aeneid.story.foundation";
    }
    
    const chainId = network === "mainnet" ? 1514 : 1315;

    // Define the chain configuration
    const chain = {
      id: chainId,
      name: network === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)",
      nativeCurrency: {
        name: "IP",
        symbol: "IP",
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: [rpcUrl],
        },
      },
    } as const;

    // Create wallet client with private key for signing
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: chain as any,
      transport: http(rpcUrl),
    });

    // Verify balance before sending
    const publicClient = createStoryPublicClient();
    const balance = await publicClient.getBalance({ address: keyAddress as Address });
    
    if (balance < amountBigInt) {
      return NextResponse.json(
        { 
          error: "Insufficient balance",
          hint: `The wallet (${keyAddress}) has ${formatEther(balance)} IP, but trying to transfer ${formatEther(amountBigInt)} IP.`
        },
        { status: 400 }
      );
    }

    // Send the transaction
    console.log("Sending IP transfer:", {
      from: keyAddress, // Use the actual address from the private key
      to: toAddress,
      amount: amountBigInt.toString(),
      network,
      chainId,
    });

    const txHash = await walletClient.sendTransaction({
      chain: chain as any,
      to: toAddress as Address,
      value: amountBigInt,
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return NextResponse.json({
      success: true,
      txHash,
      receipt: {
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      },
    });
  } catch (error) {
    console.error("Story Protocol transfer error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to transfer IP tokens",
      },
      { status: 500 }
    );
  }
}

