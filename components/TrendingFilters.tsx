"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export interface FilterState {
    searchQuery: string;
    platforms: Set<string>;
    networks: Set<string>;
    sortBy: string;
}

interface TrendingFiltersProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    totalCount: number;
    filteredCount: number;
}

const PLATFORMS = ["Spinamp", "Nina", "Sound", "Zora", "Supercollector"];
const NETWORKS = ["mainnet", "optimism", "base", "solana", "multiple"];
const SORT_OPTIONS = [
    { value: "mintCount-desc", label: "Most Popular" },
    { value: "mintCount-asc", label: "Least Popular" },
    { value: "name-asc", label: "A-Z" },
    { value: "name-desc", label: "Z-A" },
];

export default function TrendingFilters({
    filters,
    onFiltersChange,
    totalCount,
    filteredCount,
}: TrendingFiltersProps) {
    const togglePlatform = (platform: string) => {
        const newPlatforms = new Set(filters.platforms);
        if (newPlatforms.has(platform)) {
            newPlatforms.delete(platform);
        } else {
            newPlatforms.add(platform);
        }
        onFiltersChange({ ...filters, platforms: newPlatforms });
    };

    const toggleNetwork = (network: string) => {
        const newNetworks = new Set(filters.networks);
        if (newNetworks.has(network)) {
            newNetworks.delete(network);
        } else {
            newNetworks.add(network);
        }
        onFiltersChange({ ...filters, networks: newNetworks });
    };

    const clearFilters = () => {
        onFiltersChange({
            searchQuery: "",
            platforms: new Set(),
            networks: new Set(),
            sortBy: "mintCount-desc",
        });
    };

    const hasActiveFilters =
        filters.searchQuery ||
        filters.platforms.size > 0 ||
        filters.networks.size > 0;

    return (
        <div className="space-y-4 mb-6">
            {/* Search and Sort Row */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by artist or song name..."
                        value={filters.searchQuery}
                        onChange={(e) =>
                            onFiltersChange({ ...filters, searchQuery: e.target.value })
                        }
                        className="pl-10"
                    />
                </div>
                <Select
                    value={filters.sortBy}
                    onValueChange={(value) =>
                        onFiltersChange({ ...filters, sortBy: value })
                    }
                >
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Sort by..." />
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

            {/* Platform Filters */}
            <div>
                <p className="text-sm font-medium mb-2">Platform</p>
                <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                        <Badge
                            key={platform}
                            variant={filters.platforms.has(platform) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => togglePlatform(platform)}
                        >
                            {platform}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Network Filters */}
            <div>
                <p className="text-sm font-medium mb-2">Network</p>
                <div className="flex flex-wrap gap-2">
                    {NETWORKS.map((network) => (
                        <Badge
                            key={network}
                            variant={filters.networks.has(network) ? "default" : "outline"}
                            className="cursor-pointer capitalize"
                            onClick={() => toggleNetwork(network)}
                        >
                            {network}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Results Count and Clear */}
            <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                    Showing {filteredCount} of {totalCount} tracks
                </p>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Clear filters
                    </Button>
                )}
            </div>
        </div>
    );
}
