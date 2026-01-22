"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useChain, useAuthModal, useSmartAccountClient } from "@account-kit/react";
import { useRouter } from "next/navigation";
import { base } from "@account-kit/infra";
import { createPublicClient, http, parseEther, type Address } from "viem";
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
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createQuestionWithData } from "@/lib/sdk/reality-eth/reality-eth-question-wrapper";
import type { QuestionData } from "@/lib/sdk/reality-eth/reality-eth-utils";
import { REALITY_ETH_CHAIN_ID } from "@/context/context";

const predictionSchema = z.object({
  title: z.string().min(3, "Title is required"),
  type: z.enum(["bool", "single-select", "multiple-select", "uint"]),
  outcomes: z
    .array(z.object({ value: z.string().min(1, "Outcome cannot be empty") }))
    .optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  closeDate: z.string().min(1, "Close date is required"),
  closeTime: z.string().min(1, "Close time is required"),
  bond: z.string().optional(),
});

function getUnixTimestamp(date: string, time: string) {
  if (!date || !time) return 0;
  // Interpret the date/time inputs as **local time** (what the user picked in the UI),
  // then convert to a unix timestamp (seconds).
  const d = new Date(`${date}T${time}:00`);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.floor(ms / 1000);
}

type PredictionForm = z.infer<typeof predictionSchema>;

function CreatePrediction() {
  const { chain } = useChain();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    smartAccountClient,
    isLoadingClient,
    isConnected,
    walletAddress,
    smartAccountAddress: address,
  } = useWalletStatus();

  const { openAuthModal } = useAuthModal();
  const { client: accountKitClient } = useSmartAccountClient({});

  const form = useForm<PredictionForm>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      title: "",
      type: "single-select",
      outcomes: [{ value: "" }, { value: "" }],
      category: "general",
      description: "",
      closeDate: "",
      closeTime: "",
      bond: "0",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "outcomes",
  });

  const questionType = form.watch("type");

  async function onSubmit(values: PredictionForm) {
    setFormError(null);

    if (!isConnected || !walletAddress || !chain?.id) {
      setFormError("Please connect your wallet.");
      return;
    }

    if (!accountKitClient) {
      setFormError("Wallet client not ready. Please try again.");
      return;
    }

    // Validate date and time fields
    if (!values.closeDate || !values.closeTime) {
      setFormError("Please select both a close date and close time.");
      return;
    }

    // Validate outcomes for select types
    if (
      (values.type === "single-select" || values.type === "multiple-select") &&
      (!values.outcomes || values.outcomes.length < 2)
    ) {
      setFormError("At least 2 outcomes are required for select questions.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🚀 Starting prediction creation...", {
        title: values.title,
        type: values.type,
        closeDate: values.closeDate,
        closeTime: values.closeTime,
      });

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      const questionData: QuestionData = {
        type: values.type,
        title: values.title,
        outcomes: values.outcomes?.map((o) => o.value),
        category: values.category || "general",
        description: values.description,
        language: "en_US",
      };

      const openingTs = Math.floor(Date.now() / 1000);
      const closeTs = getUnixTimestamp(values.closeDate, values.closeTime);
      const nowTs = Math.floor(Date.now() / 1000);

      console.log("⏰ Time calculations:", {
        openingTs,
        closeTs,
        nowTs,
        closeDate: values.closeDate,
        closeTime: values.closeTime,
      });

      // Validate that close date/time is in the future
      if (closeTs === 0) {
        setFormError("Invalid date or time. Please check your selections.");
        setIsSubmitting(false);
        return;
      }

      if (closeTs <= nowTs) {
        setFormError("Close date and time must be in the future.");
        setIsSubmitting(false);
        return;
      }

      // Calculate timeout as the difference between opening time and close time (in seconds)
      const timeout = closeTs - openingTs;

      if (timeout <= 0) {
        setFormError("Close date and time must be after the current time.");
        setIsSubmitting(false);
        return;
      }

      console.log("✅ Validation passed, timeout:", timeout);

      const bond = values.bond ? parseEther(values.bond) : 0n;
      const nonce = BigInt(Date.now());

      // Use a default arbitrator address (Reality.eth's default arbitrator)
      // In production, you might want to use a custom arbitrator
      const arbitrator = "0x0000000000000000000000000000000000000000" as Address;

      // Template ID 0 is typically used for custom questions
      // You may need to register a template first for production use
      const templateId = 0;

      console.log("📝 Creating question with params:", {
        templateId,
        arbitrator,
        timeout,
        openingTs,
        nonce: nonce.toString(),
        bond: bond.toString(),
        questionData,
      });

      console.log("🔐 Account Kit Client:", {
        hasClient: !!accountKitClient,
        account: accountKitClient?.account?.address,
      });

      const hash = await createQuestionWithData(
        publicClient,
        accountKitClient as any,
        questionData,
        {
          templateId,
          arbitrator,
          timeout,
          openingTs,
          nonce,
          bond,
        }
      );

      console.log("✅ Transaction hash:", hash);

      toast.success("Prediction created successfully! Transaction submitted.");
      
      // Extract question ID from transaction receipt
      // Note: In production, you'd parse the question ID from the transaction logs
      // For now, we'll redirect to the predictions list
      router.push("/predict");
    } catch (error: any) {
      console.error("❌ Error creating prediction:", error);
      
      // Provide more detailed error messages
      let errorMessage = "Failed to create prediction. Please try again.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.cause?.message) {
        errorMessage = error.cause.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Check for common error patterns
      if (errorMessage.includes("user rejected") || errorMessage.includes("User rejected")) {
        errorMessage = "Transaction was cancelled. Please try again.";
      } else if (errorMessage.includes("insufficient funds") || errorMessage.includes("balance")) {
        errorMessage = "Insufficient funds. Please ensure you have enough ETH for gas and bond.";
      } else if (errorMessage.includes("network") || errorMessage.includes("chain")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
                <FormLabel>Question Title</FormLabel>
                <FormControl>
                  <Input placeholder="Will X happen?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="type"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bool">Yes/No</SelectItem>
                    <SelectItem value="single-select">Single Choice</SelectItem>
                    <SelectItem value="multiple-select">Multiple Choice</SelectItem>
                    <SelectItem value="uint">Number</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(questionType === "single-select" || questionType === "multiple-select") && (
            <div>
              <FormLabel>Outcomes</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <FormField
                    control={form.control}
                    name={`outcomes.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder={`Outcome ${index + 1}`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ value: "" })}
                className="mt-2"
              >
                Add Outcome
              </Button>
            </div>
          )}

          <FormField
            name="category"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="general" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="description"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional context about this prediction..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="closeDate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Close Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="closeTime"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Close Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            name="bond"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bond Amount (ETH, optional)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {formError && (
            <div className="text-red-500 text-sm font-medium whitespace-pre-line">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isConnected || isLoadingClient}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              "Create Prediction"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export { CreatePrediction };
