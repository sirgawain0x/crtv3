"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Clock } from "lucide-react";
import { request, gql } from "graphql-request";

interface Question {
  id: string;
  template_id: string;
  question: string;
  created: string;
  opening_ts: string;
  timeout: string;
  finalize_ts?: string;
  is_pending_arbitration: boolean;
  bounty: string;
  best_answer?: string;
  history_hash: string;
  arbitrator: string;
  min_bond: string;
  last_bond: string;
  last_bond_ts?: string;
  category?: string;
  language?: string;
  outcomes?: string[];
  title?: string;
  description?: string;
}

/**
 * PredictionList Component
 * 
 * Displays a list of active Reality.eth prediction questions.
 * Fetches questions from the Reality.eth subgraph hosted on Goldsky.
 */
export function PredictionList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const endpoint = `${window.location.origin}/api/reality-eth-subgraph`;
        console.log('🔗 Fetching Reality.eth questions from:', endpoint);

        // GraphQL query for fetching questions
        const GET_QUESTIONS_QUERY = gql`
          query GetQuestions($first: Int!, $skip: Int!, $where: Question_filter) {
            questions(
              first: $first
              skip: $skip
              where: $where
              orderBy: created
              orderDirection: desc
            ) {
              id
              template_id
              question
              created
              opening_ts
              timeout
              finalize_ts
              is_pending_arbitration
              bounty
              best_answer
              history_hash
              arbitrator
              min_bond
              last_bond
              last_bond_ts
              category
              language
              outcomes
            }
          }
        `;

        // Query for questions - fetch all questions for now
        // You can add filters later if needed (e.g., filter by finalize_ts, opening_ts, etc.)
        const variables = {
          first: 50,
          skip: 0,
          where: {}, // Empty filter to get all questions
        };

        const data = await request(endpoint, GET_QUESTIONS_QUERY, variables) as any;

        // Check for GraphQL errors
        if (data.errors) {
          console.error('GraphQL errors:', data.errors);
          throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
        }

        const fetchedQuestions = (data.questions || []) as Question[];

        // Parse question text to extract title and description
        const parsedQuestions = fetchedQuestions.map((q) => {
          let title = q.question;
          let description: string | undefined;

          try {
            // Try to parse the question text if it's encoded
            // In production, you'd fetch the template from the contract
            // For now, we'll try to extract a simple title
            if (q.question && q.question.length > 0) {
              // If the question is encoded, it might need parsing
              // For now, use the raw question as title
              title = q.question;
            }
          } catch (e) {
            console.warn('Could not parse question text for question', q.id, e);
          }

          return {
            ...q,
            title,
            description,
          };
        });

        console.log(`✅ Successfully fetched ${parsedQuestions.length} questions from Reality.eth subgraph`);
        setQuestions(parsedQuestions);
      } catch (err: any) {
        console.error('❌ Failed to fetch questions from Reality.eth subgraph:', err);
        setError(err?.message || 'Failed to load predictions. The subgraph may still be syncing.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestions();
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 w-full">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <div className="font-semibold">Failed to load predictions</div>
        <div className="text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="p-4">
        <div>No predictions found.</div>
        <div className="text-sm text-gray-500 mt-2">
          Create your first prediction to get started!
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full overflow-x-auto">
      {questions.map((question) => {
        const now = Math.floor(Date.now() / 1000);
        const openingTs = Number(question.opening_ts);
        const timeout = Number(question.timeout);
        const isActive = openingTs <= now && (timeout === 0 || (openingTs + timeout) > now);
        const isClosed = timeout > 0 && (openingTs + timeout) <= now;

        return (
          <Card key={question.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{question.title || "Untitled Prediction"}</h3>
                  <Badge variant={isActive ? "default" : isClosed ? "secondary" : "outline"}>
                    {isActive ? "Active" : isClosed ? "Closed" : "Pending"}
                  </Badge>
                </div>
                {question.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {question.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {Number(question.timeout) > 0
                        ? `Closes: ${new Date((Number(question.opening_ts) + Number(question.timeout)) * 1000).toLocaleString()}`
                        : "No timeout"}
                    </span>
                  </div>
                  {question.bounty && Number(question.bounty) > 0 && (
                    <div>Bounty: {(Number(question.bounty) / 1e18).toFixed(4)} ETH</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link href={`/predict/${question.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
