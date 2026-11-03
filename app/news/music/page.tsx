"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    getDearCreativeMusicPosts,
    getDearCreativeOriginForClient,
} from "@/app/actions/dear-creative";
import type { DearCreativePost } from "@/lib/dear-creative/types";
import { buildDearCreativePostUrl } from "@/lib/dear-creative/origin";
import { shouldShowSubscriberContentBadge } from "@/lib/dear-creative/feed";
import { NewsletterModal } from "@/components/home-page/NewsletterModal";
import { logger } from '@/lib/utils/logger';

function formatPublishedDate(publishedAt: string): string {
    const date = new Date(publishedAt);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MusicNewsPage() {
    const [posts, setPosts] = useState<DearCreativePost[]>([]);
    const [origin, setOrigin] = useState("https://news.creativeplatform.xyz");
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<DearCreativePost | null>(null);

    useEffect(() => {
        async function fetchMusicPosts() {
            try {
                const [musicPosts, resolvedOrigin] = await Promise.all([
                    getDearCreativeMusicPosts(48),
                    getDearCreativeOriginForClient(),
                ]);
                setPosts(musicPosts);
                setOrigin(resolvedOrigin);
            } catch (error) {
                logger.error("Failed to fetch music news:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchMusicPosts();
    }, []);

    const handlePostClick = (e: React.MouseEvent, post: DearCreativePost) => {
        e.preventDefault();
        setSelectedPost(post);
    };

    return (
        <div className="mx-auto w-full max-w-7xl py-12 px-4">
            <div className="mb-12 text-center">
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
                    {posts.map((post) => {
                        const postUrl = post.canonicalUrl ?? buildDearCreativePostUrl(origin, post.slug);
                        const publishedLabel = formatPublishedDate(post.publishedAt);
                        return (
                        <Link
                            key={post.slug}
                            href={postUrl}
                            onClick={(e) => handlePostClick(e, post)}
                            className="group block h-full cursor-pointer"
                        >
                            <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                    {post.coverImage ? (
                                        <Image
                                            src={post.coverImage}
                                            alt={post.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full bg-secondary text-muted-foreground">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

                                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                        {shouldShowSubscriberContentBadge(post.isGated) && (
                                            <span className="inline-block rounded-full bg-amber-500/90 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                                Subscriber content
                                            </span>
                                        )}
                                    </div>

                                    {publishedLabel && (
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <span className="inline-block rounded-full bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                                                {publishedLabel}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-grow flex-col p-6">
                                    <h2 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                                        {post.title}
                                    </h2>
                                    {post.excerpt && (
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-grow">
                                            {post.excerpt}
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
                        );
                    })}
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
                    postUrl={selectedPost.canonicalUrl ?? buildDearCreativePostUrl(origin, selectedPost.slug)}
                    title={selectedPost.title}
                />
            )}
        </div>
    );
}
