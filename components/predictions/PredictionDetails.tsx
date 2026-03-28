"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSmartAccountClient } from "@account-kit/react";
import { base } from "@account-kit/infra";
import { createPublicClient, http, fallback, formatEther } from "viem";
import { getQuestion, getFinalAnswer, type RealityEthQuestion } from "@/lib/sdk/reality-eth/reality-eth-question-wrapper";
import { parseQuestionText, formatQuestionForDisplay } from "@/lib/sdk/reality-eth/reality-eth-utils";
import { BetForm } from "./BetForm";
import { ClaimWinningsCard } from "./ClaimWinningsCard";
import { Clock, TrendingUp, Share2 } from "lucide-react";
import { logger } from '@/lib/utils/logger';
import { useToast } from "@/components/ui/use-toast";
import { EvidenceSubmissionModal } from "./EvidenceSubmissionModal";


interface PredictionDetailsProps {
  questionId: string;
}

type QuestionType = "bool" | "uint" | "single-select" | "multiple-select";

interface QuestionData extends Omit<RealityEthQuestion, 'opening_ts' | 'timeout' | 'finalize_ts'> {
  opening_ts: number;
  timeout: number;
  finalize_ts?: number;
  parsed?: {
    title: string;
    type: QuestionType;
    description?: string;
  };
}

export function PredictionDetails({ questionId }: PredictionDetailsProps) {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);

  const { client: accountKitClient } = useSmartAccountClient({});
  const { toast } = useToast();

  useEffect(() => {
    async function fetchQuestion() {
      try {
        setIsLoading(true);

        // Create public client with proper error handling
        let publicClient;
        try {
          publicClient = createPublicClient({
            chain: base,
            transport: fallback([
              http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
                ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
                : undefined),
              http("https://mainnet.base.org"),
            ]),
          });
        } catch (clientError) {
          logger.error("Error creating public client:", clientError);
          throw new Error("Failed to initialize blockchain client");
        }

        // Wrap getQuestion in try-catch to handle reality.eth library errors
        let questionDataRaw;
        try {
          questionDataRaw = await getQuestion(publicClient, questionId);
        } catch (questionError: any) {
          logger.error("Error fetching question from contract:", questionError);

          // Check if it's the reality.eth config error
          if (questionError?.message?.includes("is_native") ||
            questionError?.message?.includes("Cannot set properties")) {
            throw new Error(
              "Reality.eth configuration error. " +
              "The question may not exist or the contract configuration is invalid."
            );
          }

          throw questionError;
        }

        // Convert bigint to number for state management
        const questionData: QuestionData = {
          ...questionDataRaw,
          opening_ts: Number(questionDataRaw.opening_ts),
          timeout: Number(questionDataRaw.timeout),
          finalize_ts: questionDataRaw.finalize_ts ? Number(questionDataRaw.finalize_ts) : undefined,
        };

        // Parse question text if available
        let parsedQuestion: { title: string; type: QuestionType; description?: string } | undefined = undefined;
        if (questionData && questionData.question) {
          try {
            // In production, you'd fetch the template from the contract
            // For now, we'll just display the raw question text
            parsedQuestion = {
              title: questionData.question,
              type: "bool" as QuestionType, // Default, should be determined from template
            };
          } catch (e) {
            logger.error("Error parsing question:", e);
            parsedQuestion = {
              title: questionData.question,
              type: "bool" as QuestionType,
            };
          }
        }

        setQuestion({
          ...questionData,
          parsed: parsedQuestion,
        });

        // Try to get final answer if question is resolved
        try {
          const answer = await getFinalAnswer(publicClient, questionId);
          if (answer && answer !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            setFinalAnswer(answer);
          } else {
            // If answer is null or zero address, it's not resolved
            // No need to log "Question not yet resolved" as it's expected
          }
        } catch (e) {
          // Question might not be resolved yet
          logger.debug("Question not yet resolved or error fetching answer");
        }
      } catch (err: any) {
        logger.error("Error fetching question:", err);
        setError(err?.message || "Failed to load prediction");
      } finally {
        setIsLoading(false);
      }
    }

    if (questionId) {
      fetchQuestion();
    }
  }, [questionId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <div className="font-semibold">Failed to load prediction</div>
        <div className="text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-4">
        <div>Prediction not found</div>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isActive =
    question.opening_ts <= now &&
    (question.timeout === 0 || question.opening_ts + question.timeout > now);
  const isClosed =
    question.timeout > 0 && question.opening_ts + question.timeout <= now;

  // Refine logic for "Finalizing" state
  const isFinalizing = question.finalize_ts && question.finalize_ts > now;
  const isPendingArbitration = question.is_pending_arbitration;
  const isResolved = finalAnswer !== null;

  /* Debug State */
  logger.debug("🔍 PredictionDetails:", {
    isActive,
    isResolved,
    isFinalizing,
    isClosed,
    now,
    openingTs: question.opening_ts.toString(),
    timeout: question.timeout.toString(),
    questionType: question.parsed?.type
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="text-2xl font-bold">
            {question.parsed?.title || (question.question ? question.question : "Untitled Prediction")}
          </h1>
          <div className="flex gap-2 items-center">
            {isResolved ? (
              <Badge variant="secondary">Resolved</Badge>
            ) : isPendingArbitration ? (
              <Badge variant="destructive">Arbitration Pending</Badge>
            ) : isFinalizing ? (
              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Finalizing</Badge>
            ) : isActive ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
            ) : (
              <Badge variant="secondary">Closed</Badge>
            )}

            {!isResolved && (
              <EvidenceSubmissionModal questionId={questionId} />
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                toast({
                  title: "Link Copied",
                  description: "Prediction URL copied to clipboard.",
                });
              }}
              title="Share Prediction"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-500 space-y-1 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Opened: {new Date(Number(question.opening_ts) * 1000).toLocaleString()}
            </span>
          </div>

          {/* Show different time info based on state */}
          {isActive && question.timeout > 0 && (
            <div>
              Closes:{" "}
              {new Date(
                (Number(question.opening_ts) + Number(question.timeout)) * 1000
              ).toLocaleString()}
            </div>
          )}

          {isFinalizing && question.finalize_ts && (
            <div className="font-semibold text-yellow-600 dark:text-yellow-400">
              Finalizes: {new Date(Number(question.finalize_ts) * 1000).toLocaleString()}
            </div>
          )}

          {question.bounty && Number(question.bounty) > 0 && (
            <div>Bounty: {Number(formatEther(question.bounty)).toFixed(3)} ETH</div>
          )}
          {question.bond && Number(question.bond) > 0 && (
            <div>Current Bond: {Number(formatEther(question.bond)).toFixed(3)} ETH</div>
          )}
        </div>
      </div>

      {question.parsed?.description && (
        <div className="text-gray-700 dark:text-gray-300">
          {question.parsed.description}
        </div>
      )}

      {isResolved && finalAnswer ? (
        <>
          <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-2 items-baseline">
              <span className="font-semibold text-green-800 dark:text-green-200 whitespace-nowrap">
                Final Answer:
              </span>
              <span className="font-mono text-sm text-green-700 dark:text-green-300 break-all">
                {finalAnswer}
              </span>
            </div>
          </Card>
          <ClaimWinningsCard questionId={questionId} />
        </>
      ) : (
        /* Show Current Best Answer if available and not resolved */
        question.best_answer &&
        question.best_answer !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-600 dark:text-blue-300 mb-1">Current Best Answer</div>
            <div className="font-semibold text-blue-800 dark:text-blue-200 text-lg">
              {/* Very basic formatting for now – ideally we'd parse this based on type */}
              {BigInt(question.best_answer).toString() === "1" ? "Yes" :
                BigInt(question.best_answer).toString() === "0" ? "No" :
                  question.best_answer}
            </div>
            {isFinalizing && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Refer to "Finalizes" time above. If no other answer is posted by then, this becomes the final result.
              </div>
            )}
          </Card>
        )
      )}

      {isActive && !isResolved && (
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Place Your Bet</h2>
          <BetForm questionId={questionId} questionType={(question.parsed?.type || "bool") as QuestionType} />
        </Card>
      )}

      {!isActive && !isResolved && !isFinalizing && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-600 dark:text-gray-400">
            This prediction is closed. {isPendingArbitration ? "It is currently in arbitration." : "Waiting for resolution."}
          </div>
        </Card>
      )}
    </div>
  );
}
