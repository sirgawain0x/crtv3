"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Clock } from "lucide-react";
import { request, gql } from "graphql-request";
import { logger } from "@/lib/utils/logger";

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
const ITEMS_PER_PAGE = 20;

export function PredictionList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyAppQuestions, setShowOnlyAppQuestions] = useState(true); // Default to true to show only app questions

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
        logger.debug('🔗 Fetching Reality.eth questions from:', endpoint);

        // First, try to introspect the schema to see what fields are available
        const INTROSPECTION_QUERY = gql`
          query IntrospectSchema {
            __schema {
              queryType {
                fields {
                  name
                  type {
                    name
                    kind
                  }
                }
              }
            }
          }
        `;

        try {
          const introspectionData = await request(endpoint, INTROSPECTION_QUERY) as any;
          logger.debug('📋 Available query fields:', introspectionData?.__schema?.queryType?.fields);
        } catch (introError) {
          logger.warn('⚠️ Could not introspect schema:', introError);
        }

        // GraphQL query for fetching questions
        // The subgraph uses event-based entities, so we query log_new_question events
        // Only query fields that actually exist in the LogNewQuestion entity
        const GET_QUESTIONS_QUERY = gql`
          query GetQuestions($first: Int!, $skip: Int!) {
            logNewQuestions(
              first: $first
              skip: $skip
              orderBy: opening_ts
              orderDirection: desc
            ) {
              id
              question_id
              template_id
              question
              arbitrator
              opening_ts
              timeout
            }
          }
        `;

        // Query for questions - fetch more to allow filtering
        // Fetch up to 200 questions to allow filtering and pagination
        const variables = {
          first: 200,
          skip: 0,
        };

        let data = await request(endpoint, GET_QUESTIONS_QUERY, variables) as any;

        // Check for GraphQL errors
        if (data.errors) {
          logger.error('GraphQL errors:', data.errors);

          // Try alternative field names if logNewQuestions doesn't work
          const alternativeQueries = [
            { field: 'log_new_questions', query: gql`query GetQuestions($first: Int!, $skip: Int!) { log_new_questions(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) { id question_id template_id question arbitrator opening_ts timeout finalize_ts bounty min_bond blockNumber blockTimestamp transactionHash } }` },
            { field: 'logNewQuestion', query: gql`query GetQuestions($first: Int!, $skip: Int!) { logNewQuestion(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) { id question_id template_id question arbitrator opening_ts timeout finalize_ts bounty min_bond blockNumber blockTimestamp transactionHash } }` },
          ];

          let foundAlternative = false;
          for (const alt of alternativeQueries) {
            try {
              logger.debug(`Trying alternative field name: ${alt.field}`);
              data = await request(endpoint, alt.query, variables) as any;
              if (!data.errors && data[alt.field]) {
                logger.debug(`Found working field: ${alt.field}`);
                foundAlternative = true;
                break;
              }
            } catch (e) {
              logger.debug(`${alt.field} didn't work:`, e);
            }
          }

          if (!foundAlternative && data.errors) {
            const hasQuestionsError = data.errors.some((err: any) =>
              err.message?.includes('no field') ||
              err.message?.includes('Type `Query` has no field')
            );

            if (hasQuestionsError) {
              const errorMsg =
                "The Reality.eth subgraph doesn't have the expected query fields. " +
                "Available entities: log_new_question, log_new_answer, etc.\n\n" +
                "Please check the Goldsky dashboard GraphQL schema to see the exact field names.";
              throw new Error(errorMsg);
            }

            throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
          }
        }

        // Try different possible field names
        const fetchedQuestions = (
          data.logNewQuestions ||
          data.log_new_questions ||
          data.logNewQuestion ||
          data.log_new_question ||
          []
        ) as any[];

        // Parse question text to extract title and description
        const safeFetchedQuestions = fetchedQuestions || [];
        const parsedQuestions = safeFetchedQuestions.map((q) => {
          let title = q.question || "Untitled Prediction";
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
            logger.warn('Could not parse question text for question', q.id, e);
          }

          // Map the event-based entity to our Question interface
          // Note: log_new_question event only has basic fields, not all question data
          return {
            id: q.question_id || q.id,
            template_id: q.template_id?.toString() || "0",
            question: q.question || "",
            created: q.id || "0", // Use id as timestamp fallback since blockTimestamp isn't available
            opening_ts: q.opening_ts?.toString() || "0",
            timeout: q.timeout?.toString() || "0",
            finalize_ts: undefined, // Not available in log_new_question event - would need to query log_finalize
            is_pending_arbitration: false, // Not available in log_new_question event
            bounty: "0", // Not available in log_new_question event - would need to query separately
            best_answer: undefined, // Not available in log_new_question event
            history_hash: "", // Not available in log_new_question event
            arbitrator: q.arbitrator || "",
            min_bond: "0", // Not available in log_new_question event
            last_bond: "0", // Not available in log_new_question event
            last_bond_ts: undefined,
            category: undefined,
            language: undefined,
            outcomes: undefined,
            title,
            description,
          } as Question;
        });

        logger.debug(`Successfully fetched ${parsedQuestions.length} questions from Reality.eth subgraph`);

        // Fetch bounties for these questions
        const questionIds = parsedQuestions.map(q => q.id);

        if (questionIds.length > 0) {
          const GET_BOUNTIES_QUERY = gql`
            query GetBounties($questionIds: [String!]) {
              logFundAnswerBounties(
                where: { question_id_in: $questionIds }
                orderBy: timestamp_
                orderDirection: desc
              ) {
                question_id
                bounty
              }
            }
          `;

          try {
            logger.debug('💰 Fetching bounties for questions');
            const bountyData = await request(endpoint, GET_BOUNTIES_QUERY, { questionIds }) as any;
            const bounties = bountyData.logFundAnswerBounties || [];

            // Create a map of question_id -> bounty
            // Since we ordered by desc, the first entry for each question is the latest event
            // NOTE: Ideally we should sum them up if there are multiple funding events, 
            // but for now let's assume the latest event might have the accumulated value 
            // OR we just take the latest funding event. 
            // Actually, LogFundAnswerBounty emits 'bounty' which is the *amount added*.
            // So we need to sum them up by question_id.

            const bountyMap = new Map<string, bigint>();

            bounties.forEach((b: any) => {
              const qId = b.question_id;
              const amount = BigInt(b.bounty || 0);
              const current = bountyMap.get(qId) || BigInt(0);
              bountyMap.set(qId, current + amount);
            });

            // Update questions with bounty data
            parsedQuestions.forEach(q => {
              if (bountyMap.has(q.id)) {
                q.bounty = bountyMap.get(q.id)?.toString() || "0";
              }
            });

            logger.debug(`Updated ${bountyMap.size} questions with bounty data`);
          } catch (bountyError) {
            logger.warn('Failed to fetch bounties:', bountyError);
            // Continue without bounties, they will default to "0"
          }
        }

        // Filter to only show questions from this app if enabled
        // Questions created through this app use arbitrator: 0x0000000000000000000000000000000000000000
        const APP_ARBITRATOR = "0x0000000000000000000000000000000000000000";
        const filteredQuestions = showOnlyAppQuestions
          ? parsedQuestions.filter((q) =>
            q.arbitrator?.toLowerCase() === APP_ARBITRATOR.toLowerCase()
          )
          : parsedQuestions;

        setAllQuestions(filteredQuestions);

        // Apply pagination
        const safeFilteredQuestions = filteredQuestions || [];
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setQuestions(safeFilteredQuestions.slice(startIndex, endIndex));
      } catch (err: any) {
        logger.error('Failed to fetch questions from Reality.eth subgraph:', err);

        let errorMessage = err?.message || 'Failed to load predictions.';

        // Provide helpful error messages based on the error type
        if (err?.message?.includes("no field `questions`") ||
          err?.message?.includes("Type `Query` has no field `questions`")) {
          errorMessage =
            "The Reality.eth subgraph schema doesn't match. " +
            "This usually means:\n\n" +
            "• The subgraph hasn't been deployed to Goldsky yet\n" +
            "• The subgraph is still syncing/indexing data\n" +
            "• The subgraph schema uses different field names\n\n" +
            "Please check:\n" +
            "1. Goldsky dashboard - verify the 'reality-eth' subgraph exists\n" +
            "2. Subgraph status - ensure it's synced and indexed\n" +
            "3. Subgraph schema - verify it includes a 'questions' query field";
        } else if (err?.message?.includes("404") || err?.message?.includes("not found")) {
          errorMessage =
            "Reality.eth subgraph not found. " +
            "Please deploy the subgraph to Goldsky first. " +
            "See REALITY_ETH_SUBGRAPH_HOSTING.md for deployment instructions.";
        }

        setError(errorMessage);
        // Set empty arrays on error to prevent undefined errors
        setAllQuestions([]);
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestions();
  }, [currentPage, showOnlyAppQuestions])

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
          {showOnlyAppQuestions
            ? "No predictions found from this app. Try unchecking the filter to see all predictions."
            : "Create your first prediction to get started!"}
        </div>
      </div>
    );
  }

  const totalQuestions = allQuestions?.length || 0;
  const totalPages = totalQuestions > 0 ? Math.ceil(totalQuestions / ITEMS_PER_PAGE) : 1;
  const hasNextPage = totalQuestions > 0 && currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };



  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="filter-app-questions"
            checked={!showOnlyAppQuestions}
            onChange={(e) => {
              setShowOnlyAppQuestions(!e.target.checked);
              setCurrentPage(1); // Reset to first page when filter changes
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="filter-app-questions" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            Show all Reality.eth predictions
          </label>
        </div>
        <div className="text-sm text-gray-500">
          Showing {questions?.length || 0} of {allQuestions?.length || 0} questions
        </div>
      </div>

      {/* Questions list */}
      <div className="flex flex-col gap-4 w-full">
        {questions.map((question) => {
          const now = Math.floor(Date.now() / 1000);
          const openingTs = Number(question.opening_ts);
          const timeout = Number(question.timeout);
          const isActive = openingTs <= now && (timeout === 0 || (openingTs + timeout) > now);
          const isClosed = timeout > 0 && (openingTs + timeout) <= now;

          return (
            <Card key={question.id} className="p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-lg font-semibold break-all leading-tight min-w-0 pr-1">
                      {question.title || "Untitled Prediction"}
                    </h3>
                    <Badge className="shrink-0 mt-0.5" variant={isActive ? "default" : isClosed ? "secondary" : "outline"}>
                      {isActive ? "Active" : isClosed ? "Closed" : "Pending"}
                    </Badge>
                  </div>
                  {question.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {question.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
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
                <div className="flex flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <Link href={`/predict/${question.id}`}>
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={!hasPrevPage || isLoading}
          >
            Previous
          </Button>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasNextPage || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
