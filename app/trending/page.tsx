"use client";

import { useEffect, useState, useMemo } from "react";
import { getTrendingMusic, TrendingToken } from "@/lib/ponder";
import { getNinaTrending } from "@/lib/nina";
import { getSpinampTrending } from "@/lib/spinamp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TrendingFilters, { FilterState } from "@/components/TrendingFilters";

export default function TrendingPage() {
    const [allTracks, setAllTracks] = useState<TrendingToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: "",
        platforms: new Set(),
        networks: new Set(),
        sortBy: "mintCount-desc",
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const [ponderData, ninaData, spinampData] = await Promise.all([
                    getTrendingMusic(),
                    getNinaTrending(),
                    getSpinampTrending()
                ]);

                // Merge all data sources
                const combined = [...ponderData, ...ninaData, ...spinampData];
                setAllTracks(combined);
            } catch (error) {
                console.error("Failed to fetch trending music:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Apply filters and sorting
    const filteredTracks = useMemo(() => {
        let result = [...allTracks];

        // Search filter
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter((track) => {
                const name = track.collection.name?.toLowerCase() || "";
                const platform = track.collection.platform.toLowerCase();
                return name.includes(query) || platform.includes(query);
            });
        }

        // Platform filter
        if (filters.platforms.size > 0) {
            result = result.filter((track) =>
                filters.platforms.has(track.collection.platform)
            );
        }

        // Network filter
        if (filters.networks.size > 0) {
            result = result.filter((track) =>
                filters.networks.has(track.collection.network)
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (filters.sortBy) {
                case "mintCount-desc":
                    return parseInt(b.mintCount) - parseInt(a.mintCount);
                case "mintCount-asc":
                    return parseInt(a.mintCount) - parseInt(b.mintCount);
                case "name-asc":
                    const nameA = a.collection.name || a.tokenId;
                    const nameB = b.collection.name || b.tokenId;
                    return nameA.localeCompare(nameB);
                case "name-desc":
                    const nameA2 = a.collection.name || a.tokenId;
                    const nameB2 = b.collection.name || b.tokenId;
                    return nameB2.localeCompare(nameA2);
                default:
                    return 0;
            }
        });

        return result;
    }, [allTracks, filters]);

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-6">Trending Music</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-48 bg-muted/50" />
                            <CardContent className="h-32 bg-muted/20" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Trending Music</h1>

            <TrendingFilters
                filters={filters}
                onFiltersChange={setFilters}
                totalCount={allTracks.length}
                filteredCount={filteredTracks.length}
            />

            {filteredTracks.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">
                    {allTracks.length === 0
                        ? "No trending data found."
                        : "No tracks match your filters. Try adjusting your search or filters."}
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTracks.map((item) => (
                        <Card key={`${item.collection.platform}-${item.id}`} className="hover:shadow-lg transition-shadow overflow-hidden">
                            {item.collection.image && (
                                <div className="aspect-square w-full relative">
                                    <img
                                        src={item.collection.image}
                                        alt={item.collection.name || "Music Release"}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-lg truncate">
                                    {item.collection.name || `Token ID: ${item.tokenId}`}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Platform:</span>
                                        <span className="font-medium">{item.collection.platform}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Network:</span>
                                        <span className="font-medium capitalize">{item.collection.network}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Mints/Supply:</span>
                                        <span className="font-bold text-primary">{item.mintCount}</span>
                                    </div>
                                    <div className="pt-2 text-xs text-muted-foreground truncate">
                                        Collection: {item.collection.id}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
