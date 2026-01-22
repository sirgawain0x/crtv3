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
const ITEMS_PER_PAGE = 20;

export function PredictionList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyAppQuestions, setShowOnlyAppQuestions] = useState(true);

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
          console.log('📋 Available query fields:', introspectionData?.__schema?.queryType?.fields);
        } catch (introError) {
          console.warn('⚠️ Could not introspect schema:', introError);
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
          console.error('GraphQL errors:', data.errors);
          
          // Try alternative field names if logNewQuestions doesn't work
          const alternativeQueries = [
            { field: 'log_new_questions', query: gql`query GetQuestions($first: Int!, $skip: Int!) { log_new_questions(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) { id question_id template_id question arbitrator opening_ts timeout finalize_ts bounty min_bond blockNumber blockTimestamp transactionHash } }` },
            { field: 'logNewQuestion', query: gql`query GetQuestions($first: Int!, $skip: Int!) { logNewQuestion(first: $first, skip: $skip, orderBy: blockTimestamp, orderDirection: desc) { id question_id template_id question arbitrator opening_ts timeout finalize_ts bounty min_bond blockNumber blockTimestamp transactionHash } }` },
          ];

          let foundAlternative = false;
          for (const alt of alternativeQueries) {
            try {
              console.log(`🔄 Trying alternative field name: ${alt.field}`);
              data = await request(endpoint, alt.query, variables) as any;
              if (!data.errors && data[alt.field]) {
                console.log(`✅ Found working field: ${alt.field}`);
                foundAlternative = true;
                break;
              }
            } catch (e) {
              console.log(`❌ ${alt.field} didn't work:`, e);
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
        const parsedQuestions = fetchedQuestions.map((q) => {
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
            console.warn('Could not parse question text for question', q.id, e);
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

        console.log(`✅ Successfully fetched ${parsedQuestions.length} questions from Reality.eth subgraph`);
        
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
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setQuestions(filteredQuestions.slice(startIndex, endIndex));
      } catch (err: any) {
        console.error('❌ Failed to fetch questions from Reality.eth subgraph:', err);
        
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
          Create your first prediction to get started!
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(allQuestions.length / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="filter-app-questions"
            checked={showOnlyAppQuestions}
            onChange={(e) => {
              setShowOnlyAppQuestions(e.target.checked);
              setCurrentPage(1); // Reset to first page when filter changes
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="filter-app-questions" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            Show only questions from this app
          </label>
        </div>
        <div className="text-sm text-gray-500">
          Showing {questions.length} of {allQuestions.length} questions
        </div>
      </div>

      {/* Questions list */}
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
