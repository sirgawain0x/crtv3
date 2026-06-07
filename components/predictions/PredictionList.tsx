"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Clock, Gift } from "lucide-react";
import { request, gql } from "graphql-request";
import { getAddress, isAddress } from "viem";
import { logger } from "@/lib/utils/logger";
import {
  GET_LOG_NEW_QUESTIONS_LIST,
  GET_QUESTIONS_LIST,
  GET_QUESTIONS_LIST_BY_OPENING_TS,
  GET_QUESTIONS_LIST_MINIMAL,
} from "@/lib/sdk/reality-eth/reality-eth-subgraph";
import {
  answerBytesToLabel,
  formatCategoryLabel,
  isSongchainCategory,
  normalizeCategoryKey,
} from "@/lib/predictions/parse-prediction-display";
import { enrichPredictionDisplaySync } from "@/lib/predictions/enrich-prediction-display";
import {
  PREDICTION_CATEGORIES,
  ALL_CATEGORIES_VALUE,
} from "@/lib/predictions/categories";
import { PredictiveSearchInput } from "@/components/search/PredictiveSearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";
import type { UserClaimStatus } from "@/lib/predictions/claim-status";

const APP_ARBITRATOR = "0x0000000000000000000000000000000000000000";

type SourceFilter = "creative_tv" | "songchain" | "all";

/** Normalize subgraph Bytes (address or 32-byte word) for comparisons. */
function normalizeArbitrator(hexLike: unknown): string {
  if (hexLike == null) return "";
  let s = typeof hexLike === "string" ? hexLike.trim() : "";
  if (typeof hexLike === "object" && hexLike !== null && "hex" in hexLike) {
    s = String((hexLike as { hex: string }).hex).trim();
  }
  if (!s) return "";
  let lower = s.toLowerCase();
  if (!lower.startsWith("0x")) lower = `0x${lower}`;
  const body = lower.slice(2);
  if (body.length === 64) {
    lower = `0x${body.slice(24)}`;
  }
  if (isAddress(lower)) {
    return getAddress(lower).toLowerCase();
  }
  return lower;
}

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
  parsedCategory?: string;
  leadingLabel?: string | null;
  claimStatus?: UserClaimStatus | null;
}

function matchesSearchQuery(q: Question, sq: string): boolean {
  const haystack = [
    q.title,
    q.parsedCategory,
    q.category,
    q.description,
    q.question,
    ...(q.outcomes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(sq);
}

/**
 * PredictionList Component
 * 
 * Displays a list of active Reality.eth prediction questions.
 * Fetches questions via /api/reality-eth-subgraph (Graph Studio or Goldsky).
 */
const ITEMS_PER_PAGE = 20;

export function PredictionList() {
  const [rawQuestions, setRawQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("creative_tv");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_VALUE);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimStatusMap, setClaimStatusMap] = useState<
    Record<string, UserClaimStatus>
  >({});
  const fetchedClaimStatusRef = useRef<Set<string>>(new Set());

  const { isConnected, walletAddress, smartAccountAddress } = useWalletStatus();

  useEffect(() => {
    fetchedClaimStatusRef.current.clear();
    setClaimStatusMap({});
  }, [walletAddress, smartAccountAddress]);

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

        // Graph Studio (creative-platform) exposes `questions`. Goldsky reality-eth uses `logNewQuestions`.
        // Try `questions` first so Studio works; prefer a non-empty list if a later query shape returns [].
        const variables = {
          first: 200,
          skip: 0,
        };

        const alternativeQueries = [
          { field: "questions" as const, query: GET_QUESTIONS_LIST, label: "questions(orderBy:created)" },
          { field: "questions" as const, query: GET_QUESTIONS_LIST_BY_OPENING_TS, label: "questions(orderBy:opening_ts)" },
          { field: "questions" as const, query: GET_QUESTIONS_LIST_MINIMAL, label: "questions(minimal fields)" },
          { field: "logNewQuestions" as const, query: GET_LOG_NEW_QUESTIONS_LIST, label: "logNewQuestions" },
          { field: "log_new_questions" as const, query: gql`query GetQuestions($first: Int!, $skip: Int!) { log_new_questions(first: $first, skip: $skip, orderBy: opening_ts, orderDirection: desc) { id question_id template_id question arbitrator opening_ts timeout } }`, label: "log_new_questions" },
        ];

        let data: any = null;
        let lastQueryError: any = null;
        let usedField: (typeof alternativeQueries)[number]["field"] | null = null;

        for (const alt of alternativeQueries) {
          try {
            logger.debug(`Trying subgraph query: ${alt.label}`);
            const result = await request(endpoint, alt.query, variables) as any;
            const rows = result?.[alt.field];
            if (!Array.isArray(rows)) continue;
            if (rows.length > 0) {
              data = result;
              usedField = alt.field;
              logger.debug(`Using subgraph query: ${alt.label} (${rows.length} rows)`);
              break;
            }
            if (!data) {
              data = result;
              usedField = alt.field;
              logger.debug(`Subgraph query ${alt.label} returned 0 rows; will replace if a later query has data`);
            }
          } catch (e: any) {
            lastQueryError = e;
            logger.debug(`${alt.label} query failed:`, e?.message || e);
          }
        }

        if (!data || !usedField) {
          const errMsg = lastQueryError?.message || 'Unknown subgraph query error';
          throw new Error(
            "The Reality.eth subgraph doesn't expose a compatible question field. " +
            `Tried: ${alternativeQueries.map(q => q.label).join(', ')}. ` +
            `Last error: ${errMsg}`
          );
        }

        const fetchedQuestions = data[usedField] as any[];

        const parsedQuestions: Question[] = (fetchedQuestions || []).map((q) => {
          const rawQuestion = q.question || "";
          const subgraphOutcomes =
            usedField === "questions" && typeof q.outcomes === "string"
              ? q.outcomes
              : q.outcomes;
          const { parsed: display } = enrichPredictionDisplaySync(
            rawQuestion,
            q.template_id,
            {
              subgraphOutcomes,
              subgraphCategory: q.category ?? null,
            }
          );
          const title = display.title;
          const description = display.description;
          const parsedCategory = display.category;
          const outcomes =
            usedField === "questions" && typeof q.outcomes === "string"
              ? q.outcomes.split("\n").filter(Boolean)
              : display.outcomes;
          const enrichedDisplay = { ...display, outcomes };
          const leadingLabel = q.best_answer
            ? answerBytesToLabel(q.best_answer, enrichedDisplay)
            : null;

          if (usedField === "questions") {
            return {
              id: q.id,
              template_id: q.template_id?.toString() ?? "0",
              question: q.question ?? "",
              created: q.created?.toString() ?? "0",
              opening_ts: q.opening_ts?.toString() ?? "0",
              timeout: q.timeout?.toString() ?? "0",
              finalize_ts: q.finalize_ts != null ? String(q.finalize_ts) : undefined,
              is_pending_arbitration: Boolean(q.is_pending_arbitration),
              bounty: q.bounty?.toString() ?? "0",
              best_answer: q.best_answer,
              history_hash: q.history_hash ?? "",
              arbitrator: q.arbitrator ?? "",
              min_bond: q.min_bond?.toString() ?? "0",
              last_bond: q.last_bond?.toString() ?? "0",
              last_bond_ts: q.last_bond_ts != null ? String(q.last_bond_ts) : undefined,
              category: q.category ?? parsedCategory,
              language: q.language ?? display.language,
              outcomes,
              title,
              description,
              parsedCategory,
              leadingLabel,
            };
          }

          return {
            id: q.question_id || q.id,
            template_id: q.template_id?.toString() || "0",
            question: q.question || "",
            created: q.id || "0",
            opening_ts: q.opening_ts?.toString() || "0",
            timeout: q.timeout?.toString() || "0",
            finalize_ts: undefined,
            is_pending_arbitration: false,
            bounty: "0",
            best_answer: q.best_answer,
            history_hash: "",
            arbitrator: q.arbitrator || "",
            min_bond: "0",
            last_bond: "0",
            last_bond_ts: undefined,
            category: parsedCategory,
            language: display.language,
            outcomes,
            title,
            description,
            parsedCategory,
            leadingLabel,
          } as Question;
        });

        logger.debug(`Successfully fetched ${parsedQuestions.length} questions from Reality.eth subgraph`);

        // Fetch bounties for these questions
        const questionIds = parsedQuestions.map(q => q.id);

        // `questions` entities already include `bounty`; log-only fallbacks may not.
        if (usedField !== "questions" && questionIds.length > 0) {
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

            const bountyMap = new Map<string, bigint>();

            bounties.forEach((b: any) => {
              const qId = b.question_id;
              const amount = BigInt(b.bounty || 0);
              const current = bountyMap.get(qId) || BigInt(0);
              bountyMap.set(qId, current + amount);
            });

            parsedQuestions.forEach(q => {
              if (bountyMap.has(q.id)) {
                q.bounty = bountyMap.get(q.id)?.toString() || "0";
              }
            });

            logger.debug(`Updated ${bountyMap.size} questions with bounty data`);
          } catch (bountyError) {
            logger.warn('Failed to fetch bounties:', bountyError);
          }
        }

        setRawQuestions(parsedQuestions);
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
        setRawQuestions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    const appArbNorm = normalizeArbitrator(APP_ARBITRATOR);
    let list = rawQuestions;

    if (sourceFilter === "creative_tv") {
      list = list.filter(
        (q) => normalizeArbitrator(q.arbitrator) === appArbNorm
      );
    } else if (sourceFilter === "songchain") {
      list = list.filter(
        (q) =>
          normalizeArbitrator(q.arbitrator) === appArbNorm &&
          isSongchainCategory(q.parsedCategory ?? q.category ?? "")
      );
    }

    if (categoryFilter !== ALL_CATEGORIES_VALUE) {
      const key = normalizeCategoryKey(categoryFilter);
      list = list.filter(
        (q) => normalizeCategoryKey(q.parsedCategory ?? q.category ?? "") === key
      );
    }

    if (searchQuery.trim()) {
      const sq = searchQuery.trim().toLowerCase();
      list = list.filter((q) => matchesSearchQuery(q, sq));
    }

    return list;
  }, [rawQuestions, sourceFilter, categoryFilter, searchQuery]);

  const totalQuestions = filteredQuestions.length;
  const totalPages =
    totalQuestions > 0 ? Math.ceil(totalQuestions / ITEMS_PER_PAGE) : 1;

  const questions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      return;
    }

    const resolvedCandidates = questions.filter(
      (q) =>
        q.best_answer &&
        q.best_answer !==
          "0x0000000000000000000000000000000000000000000000000000000000000000" &&
        !fetchedClaimStatusRef.current.has(q.id)
    );

    if (resolvedCandidates.length === 0) return;

    resolvedCandidates.forEach((q) => fetchedClaimStatusRef.current.add(q.id));

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        resolvedCandidates.map(async (q) => {
          try {
            const params = new URLSearchParams({
              questionId: q.id,
              address: walletAddress,
            });
            if (smartAccountAddress) {
              params.set("smartAccount", smartAccountAddress);
            }
            const res = await fetch(
              `/api/predictions/claim-status?${params.toString()}`
            );
            if (!res.ok) {
              fetchedClaimStatusRef.current.delete(q.id);
              return [q.id, null] as const;
            }
            const data = (await res.json()) as { status: UserClaimStatus };
            return [q.id, data.status] as const;
          } catch {
            fetchedClaimStatusRef.current.delete(q.id);
            return [q.id, null] as const;
          }
        })
      );
      if (cancelled) return;
      setClaimStatusMap((prev) => {
        const next = { ...prev };
        for (const [id, status] of entries) {
          if (
            status === "won_pending_claim" ||
            status === "won_withdrawable"
          ) {
            next[id] = status;
          }
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, walletAddress, smartAccountAddress, questions]);

  const localSuggest = useCallback(
    (query: string) => {
      const sq = query.trim().toLowerCase();
      if (sq.length < 2) return [];
      return filteredQuestions
        .filter((q) => matchesSearchQuery(q, sq))
        .slice(0, 8)
        .map((q) => ({
          questionId: q.id,
          title: q.title || "Prediction",
          subtitle: q.parsedCategory
            ? formatCategoryLabel(q.parsedCategory)
            : undefined,
          href: `/predict/${q.id}`,
        }));
    },
    [filteredQuestions]
  );

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

  const totalQuestionsDisplay = filteredQuestions?.length || 0;
  const hasNextPage = totalQuestionsDisplay > 0 && currentPage < totalPages;
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

  const setFilter = (filter: SourceFilter) => {
    setSourceFilter(filter);
    setCurrentPage(1);
  };

  const setCategory = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <PredictiveSearchInput
        scope="predictions"
        placeholder="Search predictions by title, category, or outcomes…"
        onQueryChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        localSuggest={localSuggest}
        className="max-w-xl"
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-6 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Source
            </span>
          <div
            className="inline-flex rounded-lg border bg-muted/40 p-1 flex-wrap"
            role="group"
            aria-label="Prediction source filter"
          >
            <Button
              type="button"
              variant={sourceFilter === "creative_tv" ? "default" : "ghost"}
              size="sm"
              className="rounded-md shadow-none"
              onClick={() => setFilter("creative_tv")}
              aria-pressed={sourceFilter === "creative_tv"}
            >
              Creative TV
            </Button>
            <Button
              type="button"
              variant={sourceFilter === "songchain" ? "default" : "ghost"}
              size="sm"
              className="rounded-md shadow-none"
              onClick={() => setFilter("songchain")}
              aria-pressed={sourceFilter === "songchain"}
            >
              Songchain
            </Button>
            <Button
              type="button"
              variant={sourceFilter === "all" ? "default" : "ghost"}
              size="sm"
              className="rounded-md shadow-none"
              onClick={() => setFilter("all")}
              aria-pressed={sourceFilter === "all"}
            >
              All Reality.eth
            </Button>
          </div>
          {sourceFilter === "creative_tv" && (
            <p className="text-xs text-muted-foreground max-w-xl">
              Creative TV lists markets created here with{" "}
              <span className="font-mono">0x0…0</span> arbitrator. Switch to{" "}
              <strong>All Reality.eth</strong> for external arbitrators (e.g. Kleros).
            </p>
          )}
          {sourceFilter === "songchain" && (
            <p className="text-xs text-muted-foreground max-w-xl">
              Fan/community predictions posted from Songchain with category{" "}
              <strong>songchain</strong>.
            </p>
          )}
          </div>

          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Category
            </span>
            <Select value={categoryFilter} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_VALUE}>All categories</SelectItem>
                {PREDICTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalQuestionsDisplay > 0
            ? `Showing ${questions?.length || 0} of ${totalQuestionsDisplay} question${totalQuestionsDisplay === 1 ? "" : "s"}`
            : sourceFilter === "songchain"
              ? "No Songchain predictions in this view"
              : sourceFilter === "creative_tv"
                ? "No Creative TV predictions in this view"
                : "No predictions in this view"}
        </div>
      </div>

      {totalQuestionsDisplay === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium text-foreground">No predictions found</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {sourceFilter === "songchain"
              ? "No Songchain predictions yet. Create one with category “songchain”."
              : sourceFilter === "creative_tv"
                ? "Nothing created on Creative TV matches yet. Choose “All Reality.eth” to browse every indexed market."
                : "There are no indexed Reality.eth questions to show yet, or data is still syncing."}
          </p>
        </div>
      ) : (
        <>
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
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold leading-tight">
                        {question.title || "Untitled Prediction"}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {question.parsedCategory && (
                          <Badge variant="outline" className="text-xs">
                            {formatCategoryLabel(question.parsedCategory)}
                          </Badge>
                        )}
                        {question.leadingLabel && (
                          <Badge variant="secondary" className="text-xs">
                            Leading: {question.leadingLabel}
                          </Badge>
                        )}
                        {claimStatusMap[question.id] && (
                          <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700">
                            <Gift className="h-3 w-3 mr-1" aria-hidden />
                            Claim winnings
                          </Badge>
                        )}
                      </div>
                    </div>
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
        </>
      )}
    </div>
  );
}
