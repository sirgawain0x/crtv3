import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  isLoading?: boolean;
  totalDisplayed?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  hasNextPage,
  hasPrevPage,
  currentPage,
  onNextPage,
  onPrevPage,
  isLoading,
  totalDisplayed,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      <Button
        onClick={onPrevPage}
        disabled={!hasPrevPage || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Page {currentPage}</span>
        {totalDisplayed && <span>({totalDisplayed} videos)</span>}
      </div>
      
      <Button
        onClick={onNextPage}
        disabled={!hasNextPage || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

