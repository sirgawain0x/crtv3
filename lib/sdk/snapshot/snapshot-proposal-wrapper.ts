/**
 * Submits a proposal to Snapshot using either a signer or a pre-signed signature.
 * @param signer - Optional adapter with getAddress and signMessage (for server-side signing)
 * @param address - Wallet address (required if using pre-signed signature)
 * @param signature - Pre-signed signature (required if not using signer)
 * @param proposal - Proposal data (space, type, title, body, etc.)
 * @param hubUrl - Snapshot hub URL (default: https://hub.snapshot.org)
 * @returns Proposal receipt or error
 */
export async function submitSnapshotProposal({
  signer,
  address,
  signature,
  proposal,
  hubUrl = "https://hub.snapshot.org",
}: {
  signer?: {
    getAddress: () => Promise<string>;
    signMessage: (message: string | Uint8Array) => Promise<`0x${string}`>;
  };
  address?: string;
  signature?: string;
  proposal: Record<string, unknown>;
  hubUrl?: string;
}): Promise<{ id: string } | { error: string }> {
  let finalAddress: string;
  let sig: string;

  let payload: Record<string, unknown>;

  // Check if we're dealing with an EIP-712 envelope
  const isEip712 = 'domain' in proposal && 'types' in proposal && 'message' in proposal;

  if (signer) {
    // ... server-side signing logic (unchanged for now, assuming personal_sign)
    // ...
    finalAddress = await signer.getAddress();
    payload = {
      address: finalAddress,
      ...proposal,
    };
    const message = JSON.stringify(payload);
    sig = await signer.signMessage(message);
  } else if (address && signature) {
    finalAddress = address;
    sig = signature;

    if (isEip712) {
      // For EIP-712, the payload is the envelope itself
      payload = proposal as Record<string, unknown>;

      // Basic verification for EIP-712
      // We check if the 'from' field in the message matches the signer address
      const message = (proposal as any).message || {};
      const payloadAddress = message.from;

      if (!payloadAddress) {
        return { error: "EIP-712 message missing 'from' field" };
      }
      if (payloadAddress.toLowerCase() !== address.toLowerCase()) {
        return { error: "Address mismatch: message.from does not match provided address" };
      }
    } else {
      // Use pre-signed signature (Personal Sign)
      payload = proposal as Record<string, unknown>;

      // Verify the address in the payload matches the provided address
      const payloadAddress = payload.address as string | undefined;
      if (!payloadAddress) {
        return { error: "Payload missing address field" };
      }
      if (payloadAddress.toLowerCase() !== address.toLowerCase()) {
        return { error: "Address mismatch: payload address does not match provided address" };
      }
    }
  } else {
    return {
      error: "Either signer or (address and signature) must be provided",
    };
  }

  // Skip deep field validation for EIP-712 for now as structure is different
  if (!isEip712) {
    // Validate required fields for Snapshot proposal (Personal Sign)
    const requiredFields = ['space', 'type', 'title', 'body', 'choices', 'start', 'end', 'snapshot'];
    const missingFields = requiredFields.filter(field => !(field in payload) || payload[field] === undefined);

    if (missingFields.length > 0) {
      return {
        error: `Missing required fields in proposal: ${missingFields.join(', ')}`,
      };
    }
  }

  // Validate signature format
  if (!sig.startsWith('0x')) {
    return {
      error: `Invalid signature format. Expected 0x-prefixed hex string, got: ${sig.substring(0, 10)}...`,
    };
  }
  
  console.log(`Signature length: ${sig.length} chars (standard is 132)`);
  console.log(`Signature: ${sig.substring(0, 30)}...${sig.substring(sig.length - 10)}`);
  
  // Minimum length check for standard ECDSA signature
  if (sig.length < 132) {
    console.warn(`Warning: Signature is shorter than standard (${sig.length} < 132 chars)`);
  }

  // Snapshot expects: { address, sig, data }
  // where 'data' is the EIP-712 envelope { domain, types, message } for EIP-712 signatures
  // or the raw proposal data for personal_sign
  const requestBody = {
    address: finalAddress,
    sig,
    data: payload,
    // Note: 'type' field is NOT needed when using EIP-712 envelope format
    // The type is inferred from the types in the envelope
  };

  // Extract message fields for logging (handle both EIP-712 and personal_sign formats)
  const messageData = isEip712 ? (payload as any).message : payload;
  
  console.log("Submitting to Snapshot:", {
    url: `${hubUrl}/api/msg`,
    address: finalAddress,
    signatureLength: sig.length,
    signaturePrefix: sig.substring(0, 10) + "...",
    isEip712,
    payloadKeys: Object.keys(payload),
    messageFields: {
      space: messageData?.space,
      type: messageData?.type,
      title: messageData?.title,
      hasBody: !!messageData?.body,
      choicesCount: Array.isArray(messageData?.choices) ? messageData.choices.length : 0,
      start: messageData?.start,
      end: messageData?.end,
      snapshot: messageData?.snapshot,
      from: messageData?.from,
    },
    fullPayload: JSON.stringify(payload, null, 2),
  });

  const res = await fetch(`${hubUrl}/api/msg`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const responseText = await res.text();
  console.log("Snapshot response:", {
    status: res.status,
    statusText: res.statusText,
    body: responseText,
  });

  if (!res.ok) {
    // Try to parse error response for more details
    let errorMessage = `Snapshot proposal failed: ${res.statusText}`;
    let errorDetails: any = null;

    try {
      const errorJson = JSON.parse(responseText);

      // Log full error for debugging
      console.error("Full Snapshot error response:", JSON.stringify(errorJson, null, 2));

      // Extract error message with priority order
      if (errorJson.error_description) {
        errorMessage = errorJson.error_description;
        // If it's a validation error, try to get more context
        if (errorJson.error_description === "validation failed" && errorJson.details) {
          errorMessage = `Validation failed: ${JSON.stringify(errorJson.details)}`;
        } else if (errorJson.error_description === "validation failed") {
          errorMessage = "Validation failed. This could mean:\n- You don't have permission to create proposals in this space\n- You don't meet the minimum voting power requirement\n- The proposal doesn't meet the space's validation rules\n- Check the space settings at https://snapshot.org/#/" + (proposal as any).message?.space || "your-space";
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
        // Response has data but no standard error field - include it for debugging
        errorDetails = errorJson;
        errorMessage = `Snapshot proposal failed: ${res.statusText} - ${JSON.stringify(errorJson).substring(0, 200)}`;
      }

      errorDetails = errorJson;
    } catch {
      // If JSON parsing fails, include the raw response
      errorMessage = `Snapshot proposal failed: ${res.statusText} - ${responseText.substring(0, 200)}`;
    }

    // Log error details for debugging
    console.error("Snapshot error details:", errorDetails || responseText);

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
    console.log("Proposal created successfully:", json.id);
    return { id: json.id };
  }

  // Response was OK but doesn't contain an ID - check for error fields
  const errorMessage = json.error || json.message || json.reason || "Unknown error from Snapshot API";

  // Log the full response for debugging if it's not a success
  console.error("Snapshot returned error in successful response:", {
    status: res.status,
    response: json,
    errorMessage,
  });

  return { error: errorMessage };
}
