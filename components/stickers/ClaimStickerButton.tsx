"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address, type Hex, encodeFunctionData } from "viem";
import {
  CAMPAIGN_STICKERS_ADDRESS,
  campaignStickersAbi,
} from "@/lib/contracts/CampaignStickers";
import { useSmartAccountClient, useSigner } from "@/lib/wallet/react";
import { useGasSponsorship } from "@/lib/hooks/wallet/useGasSponsorship";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { buildStickerClaimAuthMessage } from "@/lib/stickers/claimAuthMessage";
import { appendBuilderCode } from "@/lib/utils/builder-code";
import { Button } from "@/components/ui/button";
import { Loader2, Sticker } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

type VerifyResponse = {
  eligible: boolean;
  tokenId?: number;
  signature?: Hex;
  ipfsHash?: string;
  name?: string | null;
  imageUri?: string | null;
  vote?: { id: string; choice: number | string; vp: number; created: number };
  error?: string;
};

type ClaimStickerButtonProps = {
  proposalId: string;
};

export function ClaimStickerButton({ proposalId }: ClaimStickerButtonProps) {
  const { client, address: smartAddress } = useSmartAccountClient({});
  const { walletAddress } = useWalletStatus();
  const signer = useSigner();
  const { getAuthHeaders } = useWalletAuth();
  const { getGasContext } = useGasSponsorship();
  const [status, setStatus] = useState<
    "idle" | "checking" | "eligible" | "ineligible" | "claiming" | "claimed" | "error"
  >("idle");
  const [verify, setVerify] = useState<VerifyResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const checkEligibility = useCallback(async () => {
    if (!smartAddress || !walletAddress || !proposalId) return;
    setStatus("checking");
    setMessage(null);
    try {
      if (!signer) {
        setStatus("error");
        setMessage("EOA signer not ready. Please reconnect.");
        return;
      }

      const authHeaders = await getAuthHeaders();
      const voterTimestamp = Math.floor(Date.now() / 1000);
      // Bind this claim delegation to the smart account + proposal so the
      // signature can't be replayed to claim for a different account.
      const voterMessage = buildStickerClaimAuthMessage({
        voter: walletAddress,
        claimer: smartAddress,
        proposalId,
        timestamp: voterTimestamp,
      });
      const voterSignature = await signer.signMessage({
        message: voterMessage,
      });

      const res = await fetch("/api/stickers/verify-vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          proposalId,
          voterEOA: walletAddress,
          claimerAddress: smartAddress,
          voterAuth: {
            address: walletAddress,
            timestamp: voterTimestamp,
            signature: voterSignature,
          },
        }),
      });
      const data = (await res.json()) as VerifyResponse;
      setVerify(data);
      if (!res.ok && res.status === 404) {
        setStatus("ineligible");
        setMessage("No campaign sticker for this proposal yet.");
        return;
      }
      if (!res.ok && res.status === 401) {
        setStatus("error");
        setMessage(data.error || "Wallet auth failed.");
        return;
      }
      if (data.eligible && data.signature) {
        setStatus("eligible");
        setMessage(
          data.vote
            ? `Voted with ${data.vote.vp} VP — claim your sticker!`
            : "You're eligible to claim."
        );
      } else {
        setStatus("ineligible");
        setMessage("Vote on this proposal to unlock the sticker claim.");
      }
    } catch (err) {
      logger.error("eligibility check failed:", err);
      setStatus("error");
      setMessage("Could not verify vote eligibility.");
    }
  }, [smartAddress, walletAddress, proposalId, signer, getAuthHeaders]);

  useEffect(() => {
    void checkEligibility();
  }, [checkEligibility]);

  const claim = useCallback(async () => {
    if (
      !client ||
      !smartAddress ||
      !verify?.signature ||
      verify.tokenId === undefined
    ) {
      toast.error("Connect your wallet and verify eligibility first.");
      return;
    }
    if (
      !CAMPAIGN_STICKERS_ADDRESS ||
      CAMPAIGN_STICKERS_ADDRESS === "0x0000000000000000000000000000000000000000"
    ) {
      toast.error("Sticker contract not configured.");
      return;
    }

    setStatus("claiming");
    try {
      const data = appendBuilderCode(
        encodeFunctionData({
          abi: campaignStickersAbi,
          functionName: "claim",
          args: [BigInt(verify.tokenId), verify.signature],
        })
      );

      const gasContext = getGasContext("sponsored");
      const operation = await client.sendUserOperation({
        uo: {
          target: CAMPAIGN_STICKERS_ADDRESS,
          data: data as Hex,
          value: 0n,
        },
        context: gasContext.context,
      });

      const txHash = await client.waitForUserOperationTransaction({
        hash: operation.hash,
      });

      const authHeaders = await getAuthHeaders();
      const recordRes = await fetch("/api/stickers/record-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          tokenId: verify.tokenId,
          wallet: smartAddress as Address,
          txHash,
          vp: verify.vote?.vp,
          choice: verify.vote?.choice,
        }),
      });
      const recordJson = await recordRes.json().catch(() => ({}));
      if (!recordRes.ok) {
        // On-chain mint already succeeded — don't revert to eligible.
        const recordError =
          typeof recordJson.error === "string"
            ? recordJson.error
            : "Failed to sync claim to inventory";
        logger.error("record-claim failed after on-chain mint:", recordJson);
        setStatus("claimed");
        toast.warning(
          `Sticker minted on-chain, but inventory sync failed: ${recordError}`
        );
        setMessage(
          "Minted to your smart wallet; inventory sync pending. Try Recheck later."
        );
        return;
      }

      setStatus("claimed");
      toast.success("Sticker claimed!");
      setMessage("Sticker minted to your smart wallet.");
    } catch (err) {
      logger.error("claim failed:", err);
      setStatus("eligible");
      const msg = err instanceof Error ? err.message : "Claim failed";
      toast.error(msg);
      setMessage(msg);
    }
  }, [client, smartAddress, verify, getGasContext, getAuthHeaders]);

  if (!smartAddress || !walletAddress) {
    return (
      <p className="text-sm text-muted-foreground">
        Connect your wallet to check sticker eligibility.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Sticker className="h-5 w-5" />
        <h3 className="font-semibold">Campaign Sticker</h3>
      </div>
      {verify?.imageUri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={verify.imageUri.replace("ipfs://", "https://ipfs.io/ipfs/")}
          alt={verify.name || "Sticker"}
          className="h-24 w-24 rounded-md object-cover"
        />
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void checkEligibility()}
          disabled={status === "checking" || status === "claiming"}
        >
          {status === "checking" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Recheck"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void claim()}
          disabled={status !== "eligible"}
        >
          {status === "claiming" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Claiming…
            </>
          ) : status === "claimed" ? (
            "Claimed"
          ) : (
            "Claim Sticker"
          )}
        </Button>
      </div>
    </div>
  );
}
