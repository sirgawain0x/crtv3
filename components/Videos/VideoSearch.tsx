"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface VideoSearchProps {
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: 'created_at' | 'views_count' | 'likes_count' | 'updated_at') => void;
  initialSearch?: string;
  initialCategory?: string;
  initialSort?: 'created_at' | 'views_count' | 'likes_count' | 'updated_at';
}

const VIDEO_CATEGORIES = [
  { value: "all", label: "All Genres" },
  { value: "Pop", label: "Pop" },
  { value: "Rock", label: "Rock" },
  { value: "Hip-Hop/Rap", label: "Hip-Hop/Rap" },
  { value: "R&B/Soul", label: "R&B/Soul" },
  { value: "EDM", label: "EDM" },
  { value: "Country", label: "Country" },
  { value: "Jazz", label: "Jazz" },
  { value: "Blues", label: "Blues" },
  { value: "Classical", label: "Classical" },
  { value: "Folk", label: "Folk" },
  { value: "Reggae", label: "Reggae" },
  { value: "Latin", label: "Latin" },
  { value: "Metal", label: "Metal" },
  { value: "Original", label: "Original" },
  { value: "Podcast", label: "Podcast" },
  { value: "World", label: "World Music" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Latest" },
  { value: "views_count", label: "Most Viewed" },
  { value: "likes_count", label: "Most Liked" },
  { value: "updated_at", label: "Recently Updated" },
];

export function VideoSearch({
  onSearchChange,
  onCategoryChange,
  onSortChange,
  initialSearch = "",
  initialCategory = "all",
  initialSort = "created_at",
}: VideoSearchProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(searchInput, 500);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    onCategoryChange(value === "all" ? "" : value);
  }, [onCategoryChange]);

  const handleSortChange = useCallback((value: string) => {
    const sortValue = value as 'created_at' | 'views_count' | 'likes_count' | 'updated_at';
    setSort(sortValue);
    onSortChange(sortValue);
  }, [onSortChange]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <div className="mb-6 space-y-4 px-2 sm:px-0">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search videos by title or description..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 pr-24"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-7 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-7 px-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters (Collapsible) */}
      {showFilters && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Category Filter */}
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Genre</label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select genre" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Filter */}
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">Sort By</label>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

