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
  totalVideos?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  hasNextPage,
  hasPrevPage,
  currentPage,
  onNextPage,
  onPrevPage,
  isLoading,
  totalDisplayed,
  totalVideos,
  itemsPerPage,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="flex items-center justify-center gap-4">
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
          {totalDisplayed !== undefined && (
            <span>({totalDisplayed} videos on this page)</span>
          )}
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
      
      {/* Show total videos and items per page info */}
      {(totalVideos !== undefined || itemsPerPage !== undefined) && (
        <div className="text-xs text-muted-foreground">
          {totalVideos !== undefined && (
            <span>Total: {totalVideos} videos</span>
          )}
          {totalVideos !== undefined && itemsPerPage !== undefined && (
            <span className="mx-2">•</span>
          )}
          {itemsPerPage !== undefined && (
            <span>{itemsPerPage} videos per page</span>
          )}
        </div>
      )}
    </div>
  );
};

