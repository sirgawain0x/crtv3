"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Clock } from "lucide-react";

/**
 * PredictionList Component
 * 
 * Displays a list of active Reality.eth prediction questions.
 * Note: In a production app, you would fetch questions from a subgraph or indexer.
 * For now, this is a placeholder that can be extended.
 */
export function PredictionList() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Implement question fetching from Reality.eth subgraph or contract events
  // For now, this is a placeholder structure

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
        const isActive = question.opening_ts <= now && (question.timeout === 0 || (question.opening_ts + question.timeout) > now);
        const isClosed = question.timeout > 0 && (question.opening_ts + question.timeout) <= now;

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
                      {question.timeout > 0
                        ? `Closes: ${new Date((question.opening_ts + question.timeout) * 1000).toLocaleString()}`
                        : "No timeout"}
                    </span>
                  </div>
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
