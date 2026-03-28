"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { MarketFilters as MarketFiltersType } from '@/lib/hooks/market/useMarketData';

interface MarketFiltersProps {
  filters: MarketFiltersType;
  onFiltersChange: (filters: Partial<MarketFiltersType>) => void;
}

export function MarketFilters({ filters, onFiltersChange }: MarketFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({ type: value as MarketFiltersType['type'] });
  };

  const handleSortByChange = (value: string) => {
    onFiltersChange({ sortBy: value as MarketFiltersType['sortBy'] });
  };

  const handleSortOrderToggle = () => {
    onFiltersChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: 'all',
      search: '',
      sortBy: 'tvl',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = filters.search || filters.type !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Type Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens, symbols, or creators..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Type Filter */}
        <Select value={filters.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Token Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tokens</SelectItem>
            <SelectItem value="metoken">MeTokens</SelectItem>
            <SelectItem value="content_coin">Content Coins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Controls Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={filters.sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tvl">TVL</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="market_cap">Market Cap</SelectItem>
              <SelectItem value="volume_24h">24h Volume</SelectItem>
              <SelectItem value="price_change_24h">24h Change</SelectItem>
              <SelectItem value="created_at">Created Date</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleSortOrderToggle}
            className="h-9 w-9"
            title={`Sort ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {filters.sortOrder === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          {filters.type !== 'all' && (
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
              Type: {filters.type === 'metoken' ? 'MeTokens' : 'Content Coins'}
            </span>
          )}
          {filters.search && (
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
              Search: {filters.search}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

