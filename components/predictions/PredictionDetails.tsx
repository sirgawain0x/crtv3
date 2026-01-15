"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSmartAccountClient } from "@account-kit/react";
import { base } from "@account-kit/infra";
import { createPublicClient, http, formatEther } from "viem";
import { getQuestion, getFinalAnswer, type RealityEthQuestion } from "@/lib/sdk/reality-eth/reality-eth-question-wrapper";
import { parseQuestionText, formatQuestionForDisplay } from "@/lib/sdk/reality-eth/reality-eth-utils";
import { BetForm } from "./BetForm";
import { Clock, TrendingUp } from "lucide-react";

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

  useEffect(() => {
    async function fetchQuestion() {
      try {
        setIsLoading(true);
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        });

        const questionDataRaw = await getQuestion(publicClient, questionId);
        
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
            console.error("Error parsing question:", e);
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
          }
        } catch (e) {
          // Question might not be resolved yet
          console.log("Question not yet resolved");
        }
      } catch (err: any) {
        console.error("Error fetching question:", err);
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
  const isResolved = finalAnswer !== null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">
            {question.parsed?.title || question.question || "Untitled Prediction"}
          </h1>
          <Badge variant={isActive ? "default" : isClosed || isResolved ? "secondary" : "outline"}>
            {isResolved
              ? "Resolved"
              : isActive
              ? "Active"
              : isClosed
              ? "Closed"
              : "Pending"}
          </Badge>
        </div>

        <div className="text-sm text-gray-500 space-y-1 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Opened: {new Date(Number(question.opening_ts) * 1000).toLocaleString()}
            </span>
          </div>
          {question.timeout > 0 && (
            <div>
              Closes:{" "}
              {new Date(
                (Number(question.opening_ts) + Number(question.timeout)) * 1000
              ).toLocaleString()}
            </div>
          )}
          {question.bounty && (
            <div>Bounty: {formatEther(question.bounty)} ETH</div>
          )}
          {question.last_bond && (
            <div>Last Bond: {formatEther(question.last_bond)} ETH</div>
          )}
        </div>
      </div>

      {question.parsed?.description && (
        <div className="text-gray-700 dark:text-gray-300">
          {question.parsed.description}
        </div>
      )}

      {isResolved && finalAnswer && (
        <Card className="p-4 bg-green-50 dark:bg-green-950">
          <div className="font-semibold text-green-800 dark:text-green-200">
            Final Answer: {finalAnswer}
          </div>
        </Card>
      )}

      {isActive && !isResolved && accountKitClient && (
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Place Your Bet</h2>
          <BetForm questionId={questionId} questionType={(question.parsed?.type || "bool") as QuestionType} />
        </Card>
      )}

      {!isActive && !isResolved && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-600 dark:text-gray-400">
            This prediction is no longer accepting bets.
          </div>
        </Card>
      )}
    </div>
  );
}
