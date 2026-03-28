"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { logger } from '@/lib/utils/logger';


// Constants and Types
import {
  API_BASE_URL,
  CLAIMED,
  LOADING,
  NO_POAP,
  STATES,
  UNCLAIMED,
} from "@/context/context";

type State = "NO_POAP" | "NOT_VOTED" | "LOADING" | "UNCLAIMED" | "CLAIMED";

interface Props {
  address: string;
  proposalId: string;
  snapshot: string;
}

// Utility function for API URL construction
const constructApiUrl = (path: string) => `${API_BASE_URL}/${path}`;

/**
 * Component for claiming POAP (Proof of Attendance Protocol) tokens.
 *
 * @component
 * @example
 * // Usage
 * <ClaimPoap address="0x1234567890" proposalId="abc123" snapshot="xyz789" />
 *
 * @param {string} address - The address of the user claiming the POAP token.
 * @param {string} proposalId - The ID of the proposal associated with the POAP token.
 * @param {string} snapshot - The snapshot ID associated with the POAP token.
 *
 * @returns {JSX.Element} The ClaimPoap component.
 */
const ClaimPoap = ({ address, proposalId, snapshot }: Props) => {
  const [poapImg, setPoapImg] = useState<string>("");
  const [currentState, setCurrentState] = useState<State>(NO_POAP);
  const [loadButton, setLoadButton] = useState<boolean>(false);

  useEffect(() => {
    const fetchState = async () => {
      try {
        // Use proposalId (Snapshot proposal ID) instead of snapshot (block number)
        // The POAP API expects the Snapshot proposal ID
        const response = await fetch(
          `/api/poap-proxy?proposalId=${encodeURIComponent(proposalId)}`
        );
        if (!response.ok) {
          // If authentication fails or POAP is not configured, show NO_POAP state
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 500 && errorData.error?.includes("authenticate")) {
            // POAP authentication not configured - silently show NO_POAP
            logger.warn("POAP authentication not configured. POAP features disabled.");
            setCurrentState(NO_POAP);
            return;
          }
          throw new Error("Failed to fetch event");
        }
        const {
          image_url,
          currentState,
        }: { image_url: string; currentState: State } = await response.json();
        setPoapImg(image_url || "");
        setCurrentState(currentState);
      } catch (error) {
        logger.error("Error fetching current state:", error);
        // Set to NO_POAP state on error so UI doesn't break
        setCurrentState(NO_POAP);
      }
    };
    fetchState();
  }, [address, proposalId]);

  const action = async () => {
    if ([CLAIMED, UNCLAIMED].includes(currentState)) {
      setLoadButton(true);
      try {
        const newState = await claim(proposalId, address);
        setCurrentState(newState);
      } catch (error) {
        logger.error("Error during claim action:", error);
      } finally {
        setLoadButton(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Image
        src={STATES[currentState].headerImage}
        alt="POAP Default"
        width={125}
        height={125}
      />
      <p className="mb-2 font-semibold">{STATES[currentState].header}</p>
      <div>
        <Image
          src={poapImg || STATES[currentState].mainImage}
          alt="POAP"
          width={125}
          height={125}
          className="align-middle w-[125px] h-auto"
        />
      </div>
      <div className="mt-5">
        {currentState === "NO_POAP" ? null : loadButton ||
          (currentState as string) === "LOADING" ? (
          <Button disabled>Minting...</Button>
        ) : ["UNCLAIMED", "CLAIMED"].includes(currentState) &&
          STATES[currentState].buttonText ? (
          <Button onClick={action}>{STATES[currentState].buttonText}</Button>
        ) : null}
      </div>
    </div>
  );
};

export default ClaimPoap;

async function claim(proposalId: string, address: string): Promise<State> {
  try {
    const response = await fetch(constructApiUrl("claim/snapshot-proposal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotProposalHash: proposalId, address }),
    });
    if (!response.ok) throw new Error("Claim request failed");
    return "LOADING"; // Assuming immediate transition to loading upon a successful claim request
  } catch (error) {
    logger.error("Error claiming POAP:", error);
    return "UNCLAIMED"; // Fallback state in case of error
  }
}
