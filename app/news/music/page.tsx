"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ParagraphAPI } from "@paragraph-com/sdk";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AlchemySwapWidget } from "@/components/wallet/swap/AlchemySwapWidget";

import { NewsletterModal } from "@/components/home-page/NewsletterModal";

export default function MusicNewsPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [isSwapOpen, setIsSwapOpen] = useState(false);

    useEffect(() => {
        async function fetchMusicPosts() {
            try {
                const api = new ParagraphAPI();
                const domain = "news.creativeplatform.xyz";

                // 1. Get Publication by Domain
                // @ts-ignore
                const pub = await api.publications.get({ domain }).single();

                if (pub?.id) {
                    // 2. Get All Posts (or first page)
                    const { items } = await api.posts.get({ publicationId: pub.id });

                    // 3. Filter for "music"
                    const musicPosts = items.filter((post: any) => {
                        const titleMatch = post.title?.toLowerCase().includes("music");
                        const bodyMatch = post.markdown?.toLowerCase().includes("music");
                        return titleMatch || bodyMatch;
                    });

                    setPosts(musicPosts);
                }
            } catch (error) {
                console.error("Failed to fetch music news:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchMusicPosts();
    }, []);

    const handlePostClick = (e: React.MouseEvent, post: any) => {
        e.preventDefault();
        setSelectedPost(post);
    };

    return (
        <div className="mx-auto w-full max-w-7xl py-12 px-4">
            <div className="mb-12 text-center relative">
                <div className="absolute right-0 top-0 hidden sm:block">
                    <Dialog open={isSwapOpen} onOpenChange={setIsSwapOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                                Buy $DEARCRTV
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] p-0 border-none bg-transparent shadow-none">
                            <AlchemySwapWidget
                                className="w-full"
                                defaultToToken="DEARCRTV"
                                onSwapSuccess={() => setIsSwapOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="sm:hidden mb-6 flex justify-center">
                    <Dialog open={isSwapOpen} onOpenChange={setIsSwapOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                                Buy $DEARCRTV
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] p-0 border-none bg-transparent shadow-none">
                            <AlchemySwapWidget
                                className="w-full"
                                defaultToToken="DEARCRTV"
                                onSwapSuccess={() => setIsSwapOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
                    Music News
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Stay updated with the latest music trends and onchain songs from Dear Creative.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex flex-col h-full overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm">
                            <div className="relative aspect-video w-full bg-muted animate-pulse" />
                            <div className="p-6 flex flex-col flex-grow space-y-4">
                                <div className="h-7 w-5/6 bg-muted animate-pulse rounded" />
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                                </div>
                                <div className="mt-auto pt-4 border-t border-border/50 flex items-center">
                                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                        <Link
                            key={post.id}
                            href={`https://news.creativeplatform.xyz/${post.slug}`}
                            onClick={(e) => handlePostClick(e, post)}
                            className="group block h-full cursor-pointer"
                        >
                            <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                    {post.imageUrl ? (
                                        <Image
                                            src={post.imageUrl}
                                            alt={post.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full bg-secondary text-muted-foreground">
                                            No Image
                                        </div>
                                    )}
                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

                                    <div className="absolute bottom-4 left-4 right-4">
                                        <span className="inline-block rounded-full bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                                            {new Date(Number(post.publishedAt)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-grow flex-col p-6">
                                    <h2 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                                        {post.title}
                                    </h2>
                                    {post.subtitle && (
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-grow">
                                            {post.subtitle}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-4 flex items-center text-sm font-medium text-primary/80 group-hover:text-primary group-hover:translate-x-1 transition-all border-t border-border/50">
                                        Read Full Article
                                        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-muted/30 border border-dashed">
                    <div className="rounded-full bg-muted p-4 mb-4">
                        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No music news found</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm">
                        Check back later for the latest updates on music and culture from Dear Creative.
                    </p>
                </div>
            )}

            {selectedPost && (
                <NewsletterModal
                    isOpen={!!selectedPost}
                    onClose={() => setSelectedPost(null)}
                    postUrl={`https://news.creativeplatform.xyz/${selectedPost.slug}`}
                    title={selectedPost.title}
                />
            )}
        </div>
    );
}

