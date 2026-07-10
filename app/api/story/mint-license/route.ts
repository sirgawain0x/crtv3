/**
 * POST /api/story/mint-license
 *
 * Mint Story Protocol license tokens for a video's IP Asset.
 * The buyer (recipient) receives license tokens that grant usage rights
 * as defined by the PIL license terms attached to the IP.
 *
 * Uses the funding wallet (STORY_PROTOCOL_PRIVATE_KEY) to sign the transaction.
 * Gas is either sponsored (NEXT_PUBLIC_STORY_POLICY_ID) or paid by the funding wallet.
 *
 * Body: { ipId, licenseTermsId, recipient, amount? }
 */

import { NextRequest, NextResponse } from "next/server";
import { checkBotIdDeep } from "@/lib/middleware/botIdGuard";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { createStoryClient } from "@/lib/sdk/story/client";
import type { Address } from "viem";
import { serverLogger } from "@/lib/utils/logger";
import { requireWalletAuthFor, WalletAuthError } from "@/lib/auth/require-wallet";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: NextRequest) {
  const verification = await checkBotIdDeep();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.strict(request);
  if (rl) return rl;

  try {
    const body = await request.json();
    const { ipId, licenseTermsId, recipient, amount } = body ?? {};

    if (!ipId || !licenseTermsId || !recipient) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          hint: "ipId, licenseTermsId, and recipient are required",
        },
        { status: 400 }
      );
    }

    if (!ADDRESS_REGEX.test(ipId)) {
      return NextResponse.json(
        { error: "Invalid ipId format" },
        { status: 400 }
      );
    }

    if (!ADDRESS_REGEX.test(recipient)) {
      return NextResponse.json(
        { error: "Invalid recipient format" },
        { status: 400 }
      );
    }

    const normalizedRecipient = recipient.toLowerCase();

    // Wallet auth — ensure the caller controls the recipient address
    try {
      await requireWalletAuthFor(request, normalizedRecipient);
    } catch (authErr) {
      if (authErr instanceof WalletAuthError) {
        return NextResponse.json(
          { error: authErr.message },
          { status: authErr.status }
        );
      }
      throw authErr;
    }

    const privateKey = process.env.STORY_PROTOCOL_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        {
          error: "Story Protocol not configured",
          hint: "STORY_PROTOCOL_PRIVATE_KEY required to sign license minting transactions",
        },
        { status: 500 }
      );
    }

    const { privateKeyToAccount } = await import("viem/accounts");
    const fundingAccount = privateKeyToAccount(
      privateKey as `0x${string}`
    );
    const fundingAddress = fundingAccount.address as Address;

    serverLogger.debug("Minting license tokens:", {
      ipId,
      licenseTermsId,
      recipient: normalizedRecipient,
      amount: amount ?? 1,
      fundingWallet: fundingAddress,
    });

    // Create Story client with funding wallet for signing
    const client = createStoryClient(fundingAddress, privateKey);

    // Mint license tokens
    const result = await client.license.mintLicenseTokens({
      licensorIpId: ipId as Address,
      licenseTermsId: BigInt(licenseTermsId),
      receiver: normalizedRecipient as Address,
      amount: amount ? BigInt(amount) : 1n,
      maxMintingFee: 0n,
      maxRevenueShare: 100,
    });

    const licenseTokenIds = result.licenseTokenIds?.map((id) => id.toString()) ?? [];

    serverLogger.debug("License tokens minted successfully:", {
      ipId,
      licenseTermsId,
      licenseTokenIds,
    });

    return NextResponse.json({
      success: true,
      licenseTokenIds,
      txHash: result.receipt?.transactionHash ?? "",
      recipient: normalizedRecipient,
      ipId,
      licenseTermsId,
    });
  } catch (error) {
    serverLogger.error("License minting error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("insufficient") ||
        error.message.includes("balance") ||
        error.message.includes("gas")
      ) {
        return NextResponse.json(
          {
            error: "Insufficient funds",
            details:
              "The funding wallet does not have enough $DATA/IP tokens to pay for gas or minting fees",
          },
          { status: 400 }
        );
      }

      if (
        error.message.includes("not attached") ||
        error.message.includes("LicenseTermsNotAttached")
      ) {
        return NextResponse.json(
          {
            error: "License terms not attached",
            details:
              "The creator must attach license terms to this IP before licenses can be minted",
          },
          { status: 400 }
        );
      }

      if (
        error.message.includes("revert") ||
        error.message.includes("execution reverted")
      ) {
        return NextResponse.json(
          {
            error: "Transaction failed",
            details: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to mint license tokens",
      },
      { status: 500 }
    );
  }
}