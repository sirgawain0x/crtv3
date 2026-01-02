"use client";

import { useEffect, useState } from "react";
import { getTrendingMusic } from "@/lib/ponder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrendingPage() {
    const [trending, setTrending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getTrendingMusic();
                setTrending(data);
            } catch (error) {
                console.error("Failed to fetch trending music:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-6">Trending Music</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted/50" />
                            <CardContent className="h-32 bg-muted/20" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Trending Music (Powered by Ponder)</h1>

            {trending.length === 0 ? (
                <p className="text-muted-foreground">No trending data found. Ensure Ponder is running.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trending.map((item) => (
                        <Card key={item.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="text-lg truncate">
                                    Token ID: {item.tokenId}
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
                                        <span className="text-muted-foreground">Mints:</span>
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
