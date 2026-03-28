/**
 * Livepeer Verifiable Video attestation: EIP-712 types and helpers.
 * @see .cursor/rules/livepeer-verifiable-video.mdc
 */

export const VERIFIABLE_VIDEO_DOMAIN = {
  name: "Verifiable Video",
  version: "1",
} as const;

export const VERIFIABLE_VIDEO_TYPES = {
  Video: [
    { name: "video", type: "string" },
    { name: "attestations", type: "Attestation[]" },
    { name: "timestamp", type: "uint256" },
  ],
  Attestation: [
    { name: "role", type: "string" },
    { name: "address", type: "address" },
  ],
} as const;

export type VerifiableVideoAttestationRole = {
  role: string;
  address: `0x${string}`;
};

/** Message payload for EIP-712 signing (Video type). */
export type VerifiableVideoMessage = {
  video: string;
  attestations: VerifiableVideoAttestationRole[];
  timestamp: bigint;
};

/** Full message sent to Livepeer API (includes signer). */
export type VerifiableVideoMessageForApi = VerifiableVideoMessage & {
  signer: string;
};

/** Payload sent to Livepeer attestation API. */
export type LivepeerAttestationPayload = {
  primaryType: "VideoAttestation";
  domain: typeof VERIFIABLE_VIDEO_DOMAIN;
  message: VerifiableVideoMessageForApi;
  signature: string;
};

/**
 * Build the EIP-712 message for signing (Video type).
 * Use creator address for attestations[].address and for signer in API payload.
 */
export const buildVerifiableVideoMessage = (
  cid: string,
  creatorAddress: `0x${string}`
): { message: VerifiableVideoMessage; messageForApi: VerifiableVideoMessageForApi } => {
  const timestamp = BigInt(Date.now());
  const video = cid.startsWith("ipfs://") ? cid : `ipfs://${cid}`;
  const attestations: VerifiableVideoAttestationRole[] = [
    { role: "creator", address: creatorAddress },
  ];
  const message: VerifiableVideoMessage = {
    video,
    attestations,
    timestamp,
  };
  const messageForApi: VerifiableVideoMessageForApi = {
    ...message,
    signer: creatorAddress,
  };
  return { message, messageForApi };
};

/**
 * Extract IPFS CID from a Livepeer asset's storage.ipfs.
 * Prefers nftMetadata.cid; falls back to parsing nftMetadata.url (ipfs://... or /ipfs/...).
 */
export const getIpfsCidFromLivepeerAsset = (asset: {
  storage?: {
    ipfs?: {
      nftMetadata?: { cid?: string; url?: string };
    };
  };
}): string | null => {
  const cid = asset.storage?.ipfs?.nftMetadata?.cid;
  if (cid) return cid;
  const url = asset.storage?.ipfs?.nftMetadata?.url;
  if (!url) return null;
  if (url.startsWith("ipfs://")) return url.replace(/^ipfs:\/\//, "").split("/")[0] ?? null;
  const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};
