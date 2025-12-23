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

  if (signer) {
    // Use signer to get address and sign message
    finalAddress = await signer.getAddress();
    payload = {
      address: finalAddress,
      ...proposal,
    };
    // Snapshot expects the payload to be signed as a stringified JSON
    // For EIP-191 personal_sign, sign the plain string (not hex-encoded)
    const message = JSON.stringify(payload);
    sig = await signer.signMessage(message);
  } else if (address && signature) {
    // Use pre-signed signature
    // CRITICAL: Use the exact proposal payload that was signed on the client
    // Do NOT reconstruct it, as JSON.stringify() field order matters for signature verification
    // Snapshot will verify the signature against JSON.stringify(payload), so it must match exactly
    finalAddress = address;
    sig = signature;
    
    // Use the exact proposal object that was signed - don't reconstruct it
    // This ensures the JSON.stringify() output matches what was signed
    payload = proposal as Record<string, unknown>;
    
    // Verify the address in the payload matches the provided address
    // The payload should already contain the address field (set by the client)
    const payloadAddress = payload.address as string | undefined;
    if (!payloadAddress) {
      return {
        error: "Payload missing address field - cannot verify signature",
      };
    }
    if (payloadAddress.toLowerCase() !== address.toLowerCase()) {
      return {
        error: "Address mismatch: payload address does not match provided address",
      };
    }
    
    // Don't modify the payload - use it exactly as signed to preserve field order
  } else {
    return {
      error: "Either signer or (address and signature) must be provided",
    };
  }

  // Validate required fields for Snapshot proposal
  const requiredFields = ['space', 'type', 'title', 'body', 'choices', 'start', 'end', 'snapshot'];
  const missingFields = requiredFields.filter(field => !(field in payload) || payload[field] === undefined);
  
  if (missingFields.length > 0) {
    return {
      error: `Missing required fields in proposal: ${missingFields.join(', ')}`,
    };
  }

  // Validate signature format (should start with 0x and be 132 characters for 65-byte signature)
  if (!sig.startsWith('0x') || sig.length !== 132) {
    return {
      error: `Invalid signature format. Expected 0x-prefixed 132 character hex string, got: ${sig.length} characters`,
    };
  }

  // Snapshot API format:
  // - address: the signer's address (top level)
  // - sig: the signature  
  // - data: the proposal data
  // - type: "proposal"
  //
  // IMPORTANT: Snapshot verifies by reconstructing the message.
  // The exact format depends on Snapshot's implementation, but typically:
  // - If data includes address: Snapshot verifies JSON.stringify(data)
  // - If data excludes address: Snapshot verifies JSON.stringify({ address, ...data })
  //
  // Since we signed: JSON.stringify({ address, ...proposal })
  // We'll try sending data WITH address first (as signed), which is the most direct match
  // If that fails, we can try without address
  
  const requestBody = {
    address: finalAddress,
    sig,
    data: payload, // Include full payload with address as it was signed
    type: "proposal",
  };

  console.log("Submitting to Snapshot:", {
    url: `${hubUrl}/api/msg`,
    address: finalAddress,
    signatureLength: sig.length,
    signaturePrefix: sig.substring(0, 10) + "...",
    payloadKeys: Object.keys(payload),
    payloadFields: {
      space: payload.space,
      type: payload.type,
      title: payload.title,
      hasBody: !!payload.body,
      choicesCount: Array.isArray(payload.choices) ? payload.choices.length : 0,
      start: payload.start,
      end: payload.end,
      snapshot: payload.snapshot,
      hasAddress: !!payload.address,
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
      
      if (errorJson.error) {
        errorMessage = `Snapshot proposal failed: ${errorJson.error}`;
        // Include additional error details if available
        if (errorJson.details) {
          errorMessage += ` - ${JSON.stringify(errorJson.details)}`;
        }
        errorDetails = errorJson;
      } else if (errorJson.message) {
        errorMessage = `Snapshot proposal failed: ${errorJson.message}`;
        errorDetails = errorJson;
      } else if (errorJson.reason) {
        errorMessage = `Snapshot proposal failed: ${errorJson.reason}`;
        errorDetails = errorJson;
      } else if (errorJson.error_description) {
        errorMessage = `Snapshot proposal failed: ${errorJson.error_description}`;
        errorDetails = errorJson;
      } else if (Object.keys(errorJson).length > 0) {
        // Response has data but no standard error field - include it for debugging
        errorDetails = errorJson;
        errorMessage = `Snapshot proposal failed: ${res.statusText} - ${JSON.stringify(errorJson).substring(0, 200)}`;
      }
      
      // For "client_error", try to extract more details
      if (errorMessage.includes("client_error") && errorJson) {
        // Log the full error response to help debug
        console.error("Snapshot client_error details - full response:", JSON.stringify(errorJson, null, 2));
        
        // Check for common issues
        if (errorJson.message) {
          errorMessage = `Snapshot proposal failed: ${errorJson.message}`;
        } else if (errorJson.reason) {
          errorMessage = `Snapshot proposal failed: ${errorJson.reason}`;
        } else {
          errorMessage = `Snapshot proposal failed: client_error - ${JSON.stringify(errorJson)}`;
        }
      }
    } catch {
      // If JSON parsing fails, include the raw response
      errorMessage = `Snapshot proposal failed: ${res.statusText} - ${responseText.substring(0, 200)}`;
    }
    
    // Only log error details if they contain useful information
    if (errorDetails) {
      console.error("Snapshot error details:", errorDetails);
    } else {
      console.error("Snapshot error - no details available. Response:", {
        status: res.status,
        statusText: res.statusText,
        body: responseText.substring(0, 500),
      });
    }
    
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
