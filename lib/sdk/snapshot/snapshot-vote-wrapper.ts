/**
 * Submits a vote to Snapshot using a pre-signed EIP-712 signature.
 * @param address - Wallet address (Smart account address for voting power, signature may be from EOA)
 * @param signature - Pre-signed EIP-712 signature (from EOA, but vote is for smart account)
 * @param vote - Vote data (space, proposal, choice, etc.)
 * @param hubUrl - Snapshot hub URL (default: https://hub.snapshot.org)
 * @returns Vote receipt or error
 */
export async function submitSnapshotVote({
  address,
  signature,
  vote,
  hubUrl = "https://hub.snapshot.org",
}: {
  address: string;
  signature: string;
  vote: Record<string, unknown>;
  hubUrl?: string;
}): Promise<{ id: string } | { error: string }> {
  if (!address) {
    return { error: "Address is required" };
  }

  if (!signature) {
    return { error: "Signature is required" };
  }

  if (!signature.startsWith("0x")) {
    return {
      error: `Invalid signature format. Expected 0x-prefixed hex string, got: ${signature.substring(0, 10)}...`,
    };
  }

  // Check if we're dealing with an EIP-712 envelope
  const isEip712 = "domain" in vote && "types" in vote && "message" in vote;

  if (!isEip712) {
    return { error: "Vote must be in EIP-712 envelope format" };
  }

  // Verify the 'from' field in the message matches the provided address
  // Note: The address should be the smart account address (for voting power),
  // and the signature may be from the EOA (if space supports EIP-1271)
  const message = (vote as any).message || {};
  const payloadAddress = message.from;

  if (!payloadAddress) {
    return { error: "EIP-712 message missing 'from' field" };
  }

  if (payloadAddress.toLowerCase() !== address.toLowerCase()) {
    return {
      error: `Address mismatch: message.from (${payloadAddress}) does not match provided address (${address}). The 'from' field should be the smart account address that holds the membership NFT.`,
    };
  }

  console.log(`Signature length: ${signature.length} chars (standard is 132)`);
  console.log(`Signature: ${signature.substring(0, 30)}...${signature.substring(signature.length - 10)}`);

  // Snapshot expects: { address, sig, data }
  // where 'data' is the EIP-712 envelope { domain, types, message }
  // The 'address' should be the smart account address (for voting power check)
  // The signature is from the EOA, but Snapshot will validate it using EIP-1271
  // if the space is configured to support smart accounts
  const requestBody = {
    address: address, // Smart account address (holds membership NFT)
    sig: signature, // EOA signature (validated via EIP-1271 if needed)
    data: vote,
  };

  // Extract message fields for logging
  console.log("Submitting vote to Snapshot:", {
    url: `${hubUrl}/api/msg`,
    address: address,
    signatureLength: signature.length,
    signaturePrefix: signature.substring(0, 10) + "...",
    isEip712: true,
    messageFields: {
      space: message.space,
      proposal: message.proposal,
      choice: message.choice,
      from: message.from,
    },
    fullPayload: JSON.stringify(vote, null, 2),
  });

  const res = await fetch(`${hubUrl}/api/msg`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const responseText = await res.text();
  console.log("Snapshot vote response:", {
    status: res.status,
    statusText: res.statusText,
    body: responseText,
  });

  if (!res.ok) {
    let errorMessage = `Snapshot vote failed: ${res.statusText}`;
    let errorDetails: any = null;

    try {
      const errorJson = JSON.parse(responseText);
      console.error("Full Snapshot error response:", JSON.stringify(errorJson, null, 2));

      if (errorJson.error_description) {
        errorMessage = errorJson.error_description;
        if (errorJson.error_description === "no voting power") {
          errorMessage =
            "You don't have voting power in this Snapshot space.\n\n" +
            "Voting power is determined by the space's voting strategy, which may require:\n" +
            "• Holding specific tokens (ERC-20)\n" +
            "• Owning specific NFTs\n" +
            "• Meeting other criteria defined by the space\n\n" +
            "To vote, you need to meet the space's voting requirements. " +
            "Check the space settings at https://snapshot.org/#/vote.thecreative.eth/settings " +
            "to see what gives voting power.";
        } else if (errorJson.error_description === "validation failed" && errorJson.details) {
          errorMessage = `Validation failed: ${JSON.stringify(errorJson.details)}`;
        } else if (errorJson.error_description === "validation failed") {
          errorMessage =
            "Vote validation failed. This could mean:\n- You don't have permission to vote in this space\n- You don't meet the minimum voting power requirement\n- The voting period has ended\n- You've already voted on this proposal";
        }
      } else if (errorJson.error) {
        errorMessage = errorJson.error;
        if (errorJson.details) {
          errorMessage += ` - ${JSON.stringify(errorJson.details)}`;
        }
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.reason) {
        errorMessage = errorJson.reason;
      } else if (Object.keys(errorJson).length > 0) {
        errorDetails = errorJson;
        errorMessage = `Snapshot vote failed: ${res.statusText} - ${JSON.stringify(errorJson).substring(0, 200)}`;
      }

      errorDetails = errorJson;
    } catch {
      errorMessage = `Snapshot vote failed: ${res.statusText} - ${responseText.substring(0, 200)}`;
    }

    console.error("Snapshot vote error details:", errorDetails || responseText);
    return { error: errorMessage };
  }

  let json: any;
  try {
    json = JSON.parse(responseText);
  } catch (parseError) {
    console.error("Failed to parse Snapshot response as JSON:", {
      responseText: responseText.substring(0, 500),
      parseError,
    });
    return { error: `Invalid JSON response from Snapshot: ${responseText.substring(0, 200)}` };
  }

  if (json.id) {
    console.log("Vote submitted successfully:", json.id);
    return { id: json.id };
  }

  // Response was OK but doesn't contain an ID - check for error fields
  const errorMessage = json.error || json.message || json.reason || "Unknown error from Snapshot API";

  console.error("Snapshot returned error in successful response:", {
    status: res.status,
    response: json,
    errorMessage,
  });

  return { error: errorMessage };
}
