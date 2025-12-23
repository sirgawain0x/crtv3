"use client";

import { useState, Suspense } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount, useChain, useSmartAccountClient, useSignMessage } from "@account-kit/react";
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
  createPoap: z.boolean().default(false),
  poapName: z.string().optional(),
  poapDescription: z.string().optional(),
  poapImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  poapEventUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type ProposalForm = z.infer<typeof proposalSchema>;

function getUnixTimestamp(date: string, time: string) {
  if (!date || !time) return 0;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 1000);
}

function Create() {
  const { address } = useAccount({ type: "ModularAccountV2" });
  const { chain } = useChain();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Get smart account client for signing using AccountKit
  const { client: smartAccountClient, isLoadingClient } = useSmartAccountClient({
    type: "ModularAccountV2",
    accountParams: {
      mode: "default",
    },
  });
  
  // Use signMessageAsync from AccountKit - returns a Promise directly (no callbacks needed)
  const { signMessageAsync, isSigningMessage, error: signMessageError } = useSignMessage({
    client: smartAccountClient || undefined,
  });

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
    if (!address || !chain?.id) {
      setFormError("Please connect your wallet.");
      return;
    }
    if (isLoadingClient) {
      setFormError("Smart account client is still loading. Please wait...");
      setIsSubmitting(false);
      return;
    }
    if (!smartAccountClient) {
      setFormError("Smart account client not ready. Please connect your wallet.");
      setIsSubmitting(false);
      return;
    }
    if (!signMessageAsync) {
      setFormError("Sign message function not available. Please refresh the page.");
      setIsSubmitting(false);
      return;
    }
    
    // Check if already signing - wait for it to complete or timeout
    if (isSigningMessage) {
      console.warn("⚠️ Signing already in progress, waiting for completion...");
      setFormError("Waiting for previous signing to complete...");
      
      // Wait up to 5 seconds for it to complete
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!isSigningMessage) {
          console.log("✅ Previous signing completed");
          setFormError(null);
          break;
        }
      }
      
      if (isSigningMessage) {
        setFormError("Previous signing operation is stuck. Please refresh the page and try again.");
        setIsSubmitting(false);
        return;
      }
    }
    const start = getUnixTimestamp(values.start, values.startTime);
    const end = getUnixTimestamp(values.end, values.endTime);
    if (end <= start) {
      setFormError("End time must be after start time.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      console.log("Starting proposal creation...");
      
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
      
      // Create proposal payload for signing with actual block number
      // Note: plugins should be an object, not a stringified JSON
      const proposalPayload = {
        address,
        space: SNAPSHOT_SPACE,
        type: "weighted",
        title: values.title,
        body: values.content,
        choices: values.choices.map((c) => c.value),
        start,
        end,
        snapshot: blockNumber,
        discussion: "",
        plugins: {
          poap: {
            address: poapEventId ? `0x${poapEventId}` : "0x0000000000000000000000000000000000000000",
            tokenId: poapTokenId || "1",
          },
        },
      };
      
      // Sign the proposal message on client side using AccountKit
      console.log("Preparing message to sign...");
      const messageToSign = JSON.stringify(proposalPayload);
      console.log("Message to sign:", messageToSign);
      console.log("Smart account client ready:", !!smartAccountClient);
      console.log("Sign message function available:", !!signMessageAsync);
      console.log("Is currently signing:", isSigningMessage);
      
      // Ensure iframe container exists
      const iframeContainer = document.getElementById("alchemy-signer-iframe-container");
      if (!iframeContainer) {
        throw new Error("Alchemy signer iframe container not found. Please refresh the page.");
      }
      console.log("Iframe container found:", !!iframeContainer);
      
      if (signMessageError) {
        throw new Error(`Sign message error: ${signMessageError.message}`);
      }
      
      // Wait for any in-progress signing to complete
      if (isSigningMessage) {
        console.warn("⚠️ Already signing, waiting for current operation to complete...");
        // Wait up to 10 seconds for current signing to complete
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!isSigningMessage) {
            console.log("✅ Previous signing operation completed");
            break;
          }
        }
        if (isSigningMessage) {
          throw new Error("Previous signing operation is still in progress. Please wait and try again.");
        }
      }
      
      // Wait a brief moment to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use signMessageAsync which returns a Promise directly (AccountKit v4.59.1+)
      console.log("Calling AccountKit signMessageAsync with message length:", messageToSign.length);
      console.log("Waiting for user to approve signing in AccountKit iframe...");
      
      let signature: string;
      try {
        signature = await signMessageAsync({
          message: messageToSign,
        });
        console.log("✅ Message signed successfully, signature:", signature?.substring(0, 20) + "...");
      } catch (error) {
        console.error("❌ Error signing message:", error);
        throw error instanceof Error 
          ? error 
          : new Error(`Failed to sign message: ${String(error)}`);
      }
      
      console.log("Signature received, submitting to server...");
      
      // Call server action with signature
      console.log("Submitting proposal to server...");
      const result = await createProposal({
        title: values.title,
        content: values.content,
        choices: values.choices.map((c) => c.value),
        start,
        end,
        address,
        chainId: chain.id,
        signature,
        proposalPayload,
      });
      
      console.log("Server response:", result);
      
      if (result?.serverError) {
        console.error("Server error:", result.serverError);
        setFormError(result.serverError || "Failed to create proposal.");
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
