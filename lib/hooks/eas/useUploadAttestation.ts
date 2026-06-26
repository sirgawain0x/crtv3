"use client";

import { useCallback, useEffect, useState } from "react";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import {
  useAccount,
  useSmartAccountClient,
} from "@/lib/wallet/react";
import { useGasSponsorship } from "@/lib/hooks/wallet/useGasSponsorship";
import {
  EAS_CONTRACT_ADDRESS,
  EAS_UPLOAD_SCHEMA,
  EAS_UPLOAD_SCHEMA_UID,
  UPLOAD_ATTESTATION_PLATFORM_NAME,
  UPLOAD_ATTESTATION_TERMS_URL,
  UPLOAD_ATTESTATION_TERMS_VERSION,
  UPLOAD_ATTESTATION_VERSION,
} from "@/lib/eas/config";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

export type AttestationStatus =
  | "idle"
  | "checking"
  | "needsAttestation"
  | "signing"
  | "submitting"
  | "success"
  | "error";

interface UploadAttestation {
  uid: string;
  attester: string;
  acceptedTerms: boolean;
  ownsCopyright: boolean;
  platformName: string;
  termsUrl: string;
  termsVersion: string;
  timestamp: number;
  version: string;
  txHash?: string;
}

const EAS_SUBGRAPH_URL = "https://base.easscan.org/graphql";

interface AttestationSubgraphNode {
  id: string;
  attester: { id: string };
  data: string;
  txHash: string;
}

export function useUploadAttestation() {
  const { address } = useAccount();
  const { client } = useSmartAccountClient({ type: "MultiOwnerModularAccount" });
  const { getAttestationGasContext } = useGasSponsorship();
  const [status, setStatus] = useState<AttestationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attestation, setAttestation] = useState<UploadAttestation | null>(null);

  const decodeAttestation = useCallback((node: AttestationSubgraphNode): UploadAttestation | null => {
    try {
      const decoder = new SchemaEncoder(EAS_UPLOAD_SCHEMA);
      const decoded = decoder.decodeData(node.data);
      const getValue = (name: string) => decoded.find((d) => d.name === name)?.value.value;
      const result: UploadAttestation = {
        uid: node.id,
        attester: node.attester.id,
        acceptedTerms: Boolean(getValue("acceptedTerms")),
        ownsCopyright: Boolean(getValue("ownsCopyright")),
        platformName: String(getValue("platformName")),
        termsUrl: String(getValue("termsUrl")),
        termsVersion: String(getValue("termsVersion")),
        timestamp: Number(getValue("timestamp")),
        version: String(getValue("version")),
        txHash: node.txHash,
      };
      if (result.acceptedTerms && result.ownsCopyright) return result;
      return null;
    } catch (err) {
      logger.warn("Failed to decode attestation:", err);
      return null;
    }
  }, []);

  const fetchAttestation = useCallback(async (): Promise<UploadAttestation | null> => {
    if (!address || !EAS_UPLOAD_SCHEMA_UID) return null;

    const query = `
      query GetUploadAttestation($schema: String!, $attester: String!) {
        attestations(
          where: {
            schema: { equals: $schema }
            attester: { equals: $attester }
            revoked: { equals: false }
          }
          orderBy: { time: desc }
          first: 1
        ) {
          id
          attester { id }
          data
          txHash
        }
      }
    `;

    const res = await fetch(EAS_SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          schema: EAS_UPLOAD_SCHEMA_UID.toLowerCase(),
          attester: address.toLowerCase(),
        },
      }),
    });

    const json = await res.json();
    const node = json?.data?.attestations?.[0];
    if (!node) return null;
    return decodeAttestation(node);
  }, [address, decodeAttestation]);

  const checkAttestation = useCallback(async () => {
    if (!address) {
      setStatus("idle");
      return null;
    }
    if (!EAS_UPLOAD_SCHEMA_UID) {
      setError("EAS schema UID is not configured");
      setStatus("error");
      return null;
    }

    setStatus("checking");
    setError(null);

    try {
      const found = await fetchAttestation();
      if (found) {
        setAttestation(found);
        setStatus("success");
        return found;
      }
      setAttestation(null);
      setStatus("needsAttestation");
      return null;
    } catch (err) {
      logger.error("Failed to check upload attestation:", err);
      setError(err instanceof Error ? err.message : "Failed to verify attestation");
      setStatus("error");
      return null;
    }
  }, [address, fetchAttestation]);

  const signAttestation = useCallback(async () => {
    if (!address || !client) {
      toast.error("Wallet not ready");
      return null;
    }
    if (!EAS_UPLOAD_SCHEMA_UID) {
      toast.error("EAS schema UID is not configured");
      return null;
    }

    setStatus("signing");
    setError(null);

    try {
      const encoder = new SchemaEncoder(EAS_UPLOAD_SCHEMA);
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const encoded = encoder.encodeData([
        { name: "attester", value: address as `0x${string}`, type: "address" },
        { name: "acceptedTerms", value: true, type: "bool" },
        { name: "ownsCopyright", value: true, type: "bool" },
        { name: "platformName", value: UPLOAD_ATTESTATION_PLATFORM_NAME, type: "string" },
        { name: "termsUrl", value: UPLOAD_ATTESTATION_TERMS_URL, type: "string" },
        { name: "termsVersion", value: UPLOAD_ATTESTATION_TERMS_VERSION, type: "string" },
        { name: "timestamp", value: timestamp, type: "uint64" },
        { name: "version", value: UPLOAD_ATTESTATION_VERSION, type: "string" },
      ]) as `0x${string}`;

      const { context, isSponsored } = getAttestationGasContext();
      logger.debug("Attestation gas context:", { isSponsored, hasContext: !!context });

      setStatus("submitting");

      const txHash = await client.sendUserOperation({
        uo: {
          target: (EAS_CONTRACT_ADDRESS.startsWith("0x") ? EAS_CONTRACT_ADDRESS : `0x${EAS_CONTRACT_ADDRESS}`) as `0x${string}`,
          data: encodeFunctionData({
            abi: EAS_ABI,
            functionName: "attest",
            args: [
              EAS_UPLOAD_SCHEMA_UID as `0x${string}`,
              {
                recipient: "0x0000000000000000000000000000000000000000",
                expirationTime: 0n,
                revocable: false,
                refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
                data: encoded,
                value: 0n,
              },
            ],
          }) as `0x${string}`,
        },
        context,
      });

      logger.debug("Attestation UserOp hash:", txHash);
      toast.success("Attestation submitted — waiting for confirmation");

      const found = await waitForAttestation(fetchAttestation);
      if (!found) {
        throw new Error("Attestation was not found on-chain after submission");
      }

      setAttestation(found);
      setStatus("success");
      toast.success("Upload rights attestation confirmed");
      return found;
    } catch (err) {
      logger.error("Attestation signing failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to sign attestation";
      setError(msg);
      setStatus("error");
      toast.error(msg);
      return null;
    }
  }, [address, client, fetchAttestation, getAttestationGasContext]);

  useEffect(() => {
    void checkAttestation();
  }, [checkAttestation]);

  return {
    status,
    error,
    attestation,
    isAttested: status === "success",
    needsAttestation: status === "needsAttestation" || status === "error" || status === "idle",
    isLoading: status === "checking" || status === "signing" || status === "submitting",
    checkAttestation,
    signAttestation,
  };
}

async function waitForAttestation(
  fetchAttestation: () => Promise<UploadAttestation | null>,
  maxAttempts = 30,
  intervalMs = 3000
): Promise<UploadAttestation | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const found = await fetchAttestation();
      if (found) return found;
    } catch {
      // ignore polling errors
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return null;
}

const EAS_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "schema", type: "bytes32" },
      {
        components: [
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint64", name: "expirationTime", type: "uint64" },
          { internalType: "bool", name: "revocable", type: "bool" },
          { internalType: "bytes32", name: "refUID", type: "bytes32" },
          { internalType: "bytes", name: "data", type: "bytes" },
          { internalType: "uint256", name: "value", type: "uint256" },
        ],
        internalType: "struct AttestationRequestData",
        name: "data",
        type: "tuple",
      },
    ],
    name: "attest",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;
