"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useChain, useAuthModal, useSigner } from "@account-kit/react";
import { useRouter } from "next/navigation";
import { createProposal } from "@/app/vote/create/[address]/actions";
import { SNAPSHOT_SPACE } from "@/context/context";
import { createPublicClient } from "viem";
import { alchemy, base } from "@account-kit/infra";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { useLinkedIdentity } from "@/lib/hooks/useLinkedIdentity";
import { formatProposalAuthor } from "@/lib/utils/linked-identity";
import { shortenAddress } from "@/lib/utils/utils";

const proposalSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(3, "Content is required"),
  choices: z
    .array(z.object({ value: z.string().min(1, "Choice cannot be empty") }))
    .min(2, "At least two choices required"),
  start: z.string().min(1, "Start date required"),
  startTime: z.string().min(1, "Start time required"),
  end: z.string().min(1, "End date required"),
  endTime: z.string().min(1, "End time required"),
  // POAP fields (optional)
  createPoap: z.boolean(),
  poapName: z.string().optional(),
  poapDescription: z.string().optional(),
  poapImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  poapEventUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type ProposalForm = z.infer<typeof proposalSchema>;

function getUnixTimestamp(date: string, time: string) {
  if (!date || !time) return 0;
  // Interpret the date/time inputs as **local time** (what the user picked in the UI),
  // then convert to a unix timestamp (seconds).
  //
  // Using Date.UTC here can shift the timestamp and accidentally place `end` in the past
  // for users outside UTC, which Snapshot rejects.
  const d = new Date(`${date}T${time}:00`);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.floor(ms / 1000);
}

function Create() {
  const { chain } = useChain();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Use the shared wallet status hook to ensure we're using the correct client context
  const {
    smartAccountClient,
    isLoadingClient,
    isConnected,
    walletAddress, // EOA address (for signing)
    smartAccountAddress: address, // Smart Wallet address (primary identity)
  } = useWalletStatus();

  // Get linked identity information
  const { linkedIdentity, isPermitted, isVerifying } = useLinkedIdentity();

  // Auth modal for re-authentication if connection is lost
  const { openAuthModal } = useAuthModal();

  /**
   * IDENTITY STRATEGY FOR CREATIVE TV:
   * 
   * Primary Identity (Public): Smart Wallet Address
   * - This is what users see and interact with
   * - Used for receiving assets, tips, IP sales
   * - Better security, social recovery, Web2-like UX
   * 
   * Functional Identity (Background): EOA Address
   * - Used for signing operations (Snapshot, approvals, etc.)
   * - Many governance tools (like Snapshot) require ECDSA signatures from EOA
   * - Kept in background for permissions and author roles
   * 
   * SNAPSHOT SPECIFIC:
   * Snapshot sequencer validates signatures as EOA ECDSA (ecrecover). It does NOT accept
   * smart account / ERC-1271 / ERC-6492 signatures for proposal creation.
   * 
   * Therefore, we must sign the Snapshot EIP-712 payload with the underlying EOA signer,
   * and submit `address` + `message.from` as the EOA address (walletAddress).
   * 
   * FUTURE ENHANCEMENT:
   * Consider using Delegate.cash to link EOA to Smart Wallet, allowing Smart Wallet
   * to get "credit" for proposals while EOA does the actual signing.
   */
  const signer = useSigner();

  // Debug info on mount
  useEffect(() => {
    console.log("=== Wallet Debug Info ===");
    console.log("Smart account client:", smartAccountClient ? "exists" : "null");
    console.log("Smart account address:", address || "not available");
    console.log("Wallet address:", walletAddress || "not available");
    console.log("=========================");
  }, [smartAccountClient, address, walletAddress]);

  const form = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      content: "",
      choices: [{ value: "Yes" }, { value: "No" }],
      start: "",
      startTime: "",
      end: "",
      endTime: "",
      createPoap: false,
      poapName: "",
      poapDescription: "",
      poapImageUrl: "",
      poapEventUrl: "",
    },
    mode: "onTouched",
  });

  const createPoap = form.watch("createPoap");

  const { fields, append, remove } = useFieldArray<ProposalForm>({
    control: form.control,
    name: "choices",
  });

  async function onSubmit(values: ProposalForm) {
    setFormError(null);

    // Validate connection state
    if (!isConnected || !walletAddress || !chain?.id) {
      setFormError("Please connect your wallet.");
      return;
    }

    // Snapshot requires EOA signature
    if (!signer) {
      setFormError("Signer not available. Please sign in again.");
      openAuthModal();
      return;
    }

    // Verify EOA is a permitted signer for Smart Wallet (if Smart Wallet exists)
    if (address && walletAddress && address.toLowerCase() !== walletAddress.toLowerCase()) {
      if (isVerifying) {
        setFormError("Verifying signer permissions...");
        return;
      }
      if (isPermitted === false) {
        setFormError(
          "Your EOA is not a permitted signer for your Smart Wallet. " +
          "Please ensure you're using the correct wallet or contact support."
        );
        return;
      }
    }

    const start = getUnixTimestamp(values.start, values.startTime);
    const end = getUnixTimestamp(values.end, values.endTime);
    const nowTs = Math.floor(Date.now() / 1000);

    if (end <= start) {
      setFormError("End time must be after start time.");
      return;
    }
    // Snapshot requires proposal end date to be in the future
    if (end <= nowTs) {
      setFormError("End time must be in the future.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Starting proposal creation...");
      console.log("Using wallet address:", walletAddress);
      console.log("Smart account address:", address);

      // Get current block number before signing
      console.log("Fetching block number...");
      const publicClient = createPublicClient({
        chain: base,
        transport: alchemy({
          apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
        }),
      });
      const block = await publicClient.getBlockNumber();
      const blockNumber = Number(block);
      console.log("Block number fetched:", blockNumber);

      // Create POAP event if requested
      let poapEventId: string | null = null;
      let poapTokenId: string | null = null;

      if (values.createPoap && values.poapName && values.poapDescription) {
        try {
          console.log("Creating POAP event...");
          const poapResponse = await fetch("/api/poap/create-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: values.poapName,
              description: values.poapDescription,
              image_url: values.poapImageUrl || undefined,
              start_date: new Date(start * 1000).toISOString(),
              end_date: new Date(end * 1000).toISOString(),
              event_url: values.poapEventUrl || undefined,
              virtual_event: true,
            }),
          });

          if (poapResponse.ok) {
            const poapData = await poapResponse.json();
            poapEventId = poapData.data?.id || poapData.data?.fancy_id;
            poapTokenId = poapData.data?.token_id || "1";
            console.log("POAP event created:", poapEventId);
          } else {
            const error = await poapResponse.json();
            console.warn("Failed to create POAP event:", error);
            // Continue with proposal creation even if POAP creation fails
          }
        } catch (poapError) {
          console.error("Error creating POAP event:", poapError);
          // Continue with proposal creation even if POAP creation fails
        }
      }

      // Prepare EIP-712 typed data for signing
      // Using Snapshot's exact proposal types from @snapshot-labs/snapshot.js
      console.log("Preparing typed data to sign...");

      const domain = {
        name: "snapshot",
        version: "0.1.4",
      } as const;

      // Snapshot's exact proposal types - must match their schema exactly
      const types = {
        Proposal: [
          { name: "from", type: "string" },
          { name: "space", type: "string" },
          { name: "timestamp", type: "uint64" },
          { name: "type", type: "string" },
          { name: "title", type: "string" },
          { name: "body", type: "string" },
          { name: "discussion", type: "string" },
          { name: "choices", type: "string[]" },
          { name: "labels", type: "string[]" },
          { name: "start", type: "uint64" },
          { name: "end", type: "uint64" },
          { name: "snapshot", type: "uint64" },
          { name: "plugins", type: "string" },
          // Some Snapshot sequencer configs reject proposals that explicitly set `privacy`,
          // but still expect `privacy` to exist in `types`. To handle this, we:
          // - include `privacy` in the EIP-712 types (matches Snapshot.js)
          // - sign with `privacy: ""`
          // - omit `privacy` from the submitted message payload (server should default it)
          { name: "privacy", type: "string" },
          { name: "app", type: "string" },
        ],
      } as const;

      const now = Math.floor(Date.now() / 1000);

      // Build the message with all required fields matching Snapshot's schema
      // Message used for SIGNING (includes privacy, because it's in the types)
      const typedMessage = {
        from: walletAddress, // EOA address (Snapshot requires EOA signature)
        space: SNAPSHOT_SPACE,
        timestamp: BigInt(now),
        type: "single-choice" as const,
        title: values.title,
        body: values.content,
        discussion: "",
        choices: values.choices.map((c) => c.value),
        labels: [] as string[],
        start: BigInt(start),
        end: BigInt(end),
        snapshot: BigInt(blockNumber),
        plugins: JSON.stringify({
          poap: {
            address: poapEventId ? `0x${poapEventId}` : "0x0000000000000000000000000000000000000000",
            tokenId: poapTokenId || "1",
          },
          // Store Smart Wallet address for linked identity display
          creativeTv: {
            smartWallet: address || null, // Primary identity (Smart Wallet)
            eoa: walletAddress, // Signing identity (EOA)
          },
        }),
        privacy: "",
        app: "creative-tv",
      };

      console.log("Signing Typed Data:", { domain, types, message: typedMessage });

      // Best-effort: verify signer is responsive and bound to the expected EOA.
      // Some environments report waitForConnected timeouts even when signing works, so do not hard-fail on it.
      try {
        const signerAddr = await Promise.race([
          signer.getAddress(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getAddress timed out")), 10000),
          ),
        ]);
        console.log("Signer getAddress():", signerAddr);
        if (signerAddr?.toLowerCase?.() !== walletAddress.toLowerCase()) {
          console.warn(
            "Signer address mismatch; expected walletAddress",
            walletAddress,
            "got",
            signerAddr,
          );
        }
      } catch (e) {
        console.warn("Signer getAddress failed/timed out:", e);
        setFormError("Wallet signer is not ready. Please sign in again.");
        openAuthModal();
        return;
      }

      if (typeof (signer as any).waitForConnected === "function") {
        try {
          await Promise.race([
            (signer as any).waitForConnected(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("waitForConnected timed out")), 30000),
            ),
          ]);
          console.log("Signer waitForConnected(): connected");
        } catch (e) {
          console.warn("Signer waitForConnected failed/timed out:", e);
          // Continue anyway; signing may still succeed.
        }
      }

      console.log("Using EOA signer.signTypedData (Snapshot-compatible)...");

      const signature = await Promise.race([
        signer.signTypedData({
          domain,
          types,
          primaryType: "Proposal",
          message: typedMessage,
        } as any),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Signing timed out after 120s")), 120000),
        ),
      ]);

      console.log("✅ Typed Data Signed successfully:", signature);

      console.log("Submitting proposal to server...");

      // Snapshot.js expects the EIP-712 envelope format: { domain, types, message }
      // The 'message' contains the actual signed data structure
      // Note: Convert BigInts to numbers for JSON serialization
      const envelope = {
        domain,
        types,
        message: {
          from: walletAddress,
          space: SNAPSHOT_SPACE,
          timestamp: now, // number for JSON
          type: "single-choice",
          title: values.title,
          body: values.content,
          discussion: "",
          choices: values.choices.map((c) => c.value),
          labels: [],
          start: start, // number for JSON
          end: end, // number for JSON
          snapshot: blockNumber, // number for JSON
          plugins: JSON.stringify({
            poap: {
              address: poapEventId ? `0x${poapEventId}` : "0x0000000000000000000000000000000000000000",
              tokenId: poapTokenId || "1",
            },
            // Store Smart Wallet address for linked identity display
            creativeTv: {
              smartWallet: address || null, // Primary identity (Smart Wallet)
              eoa: walletAddress, // Signing identity (EOA)
            },
          }),
          // Must match the signed typed data exactly for signature validation to pass
          privacy: "",
          app: "creative-tv",
        },
      };

      const result = await createProposal({
        title: values.title,
        content: values.content,
        choices: values.choices.map((c) => c.value),
        start,
        end,
        // Snapshot expects the signing address here (EOA)
        address: walletAddress,
        chainId: chain.id,
        signature,
        // Pass the EIP-712 envelope - this is what Snapshot's API expects
        proposalPayload: envelope,
      });

      if (result?.serverError) {
        console.error("Server error:", result.serverError);
        // Format the error message to be more user-friendly
        let errorMsg = result.serverError;
        if (errorMsg.includes("validation failed")) {
          const spaceUrl = `https://snapshot.org/#/${SNAPSHOT_SPACE}/settings`;
          errorMsg = `Proposal validation failed. This usually means:\n\n• You don't have permission to create proposals (check if you're a member/admin)\n• You don't meet the minimum voting power requirement\n• The proposal doesn't meet the space's validation rules\n• The voting period might be too short\n\nCheck space settings: ${spaceUrl}\n\nIf you believe this is an error, contact the space admin.`;
        }
        setFormError(errorMsg || "Failed to create proposal.");
        return;
      }
      if (result?.validationErrors) {
        console.error("Validation errors:", result.validationErrors);
        setFormError("Validation failed. Please check your input.");
        return;
      }
      if (!result?.data) {
        console.error("No data in result:", result);
        setFormError("Failed to create proposal.");
        return;
      }

      console.log("Proposal created successfully:", result.data);
      
      // Show success message with linked identity
      const authorDisplay = linkedIdentity?.isLinked
        ? formatProposalAuthor(address || null, walletAddress)
        : shortenAddress(walletAddress);
      
      console.log(`Proposal submitted by: ${authorDisplay}`);
      router.push("/vote");
    } catch (error) {
      console.error("Error creating proposal:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to create proposal. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-wrap items-start justify-center p-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full p-5 md:w-2/5 space-y-6"
          >
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="[#BrandName] Campaign Voting"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="content"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your proposal..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Choices</FormLabel>
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2 mb-2">
                  <FormField
                    name={`choices.${idx}.value`}
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder={`Choice ${idx + 1}`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(idx)}
                      aria-label="Remove choice"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ value: "" })}
              >
                Add Choice
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="start"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="startTime"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="end"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="endTime"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* POAP Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base font-semibold">Create POAP</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Create a POAP event for voters to claim after voting
                  </p>
                </div>
                <FormField
                  name="createPoap"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {createPoap && (
                <div className="space-y-4 pl-4 border-l-2">
                  <FormField
                    name="poapName"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>POAP Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Vote on Proposal #123"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="poapDescription"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>POAP Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the POAP event..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="poapImageUrl"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>POAP Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com/image.png"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="poapEventUrl"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com/event"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {formError && (
              <div className="text-red-500 text-sm font-medium">
                {formError}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </Suspense>
  );
}

export { Create };
