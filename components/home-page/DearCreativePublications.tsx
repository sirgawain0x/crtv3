"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NewsletterModal } from "./NewsletterModal";
import {
    getDearCreativeActiveSubscriberCount,
    getDearCreativeOriginForClient,
    getDearCreativeRecentPosts,
} from "@/app/actions/dear-creative";
import type { DearCreativePost } from "@/lib/dear-creative/types";
import {
    formatDearCreativeSubscriberLine,
    shouldShowSubscriberContentBadge,
} from "@/lib/dear-creative/feed";
import { buildDearCreativePostUrl } from "@/lib/dear-creative/origin";
import { Newspaper } from "lucide-react";
import { logger } from '@/lib/utils/logger';

function formatPublishedDate(publishedAt: string): string {
    const date = new Date(publishedAt);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DearCreativePublications() {
    const [posts, setPosts] = useState<DearCreativePost[]>([]);
    const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
    const [origin, setOrigin] = useState("https://news.creativeplatform.xyz");
    const [loading, setLoading] = useState(true);
    const [activePost, setActivePost] = useState<DearCreativePost | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                setLoading(true);
                const [fetchedPosts, count, resolvedOrigin] = await Promise.all([
                    getDearCreativeRecentPosts(3),
                    getDearCreativeActiveSubscriberCount(),
                    getDearCreativeOriginForClient(),
                ]);

                if (isMounted) {
                    setPosts(fetchedPosts);
                    setSubscriberCount(count);
                    setOrigin(resolvedOrigin);
                }
            } catch (error) {
                logger.error("Failed to fetch Dear Creative data:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    const handlePostClick = (e: React.MouseEvent, post: DearCreativePost) => {
        e.preventDefault();
        setActivePost(post);
    };

    if (loading && posts.length === 0) {
        return (
            <div className="mx-auto w-full max-w-7xl py-8">
                <div className="mb-8 text-center">
                    <div className="mx-auto h-8 w-64 bg-muted animate-pulse rounded"></div>
                    <div className="mx-auto mt-2 h-4 w-32 bg-muted animate-pulse rounded"></div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col h-full overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm">
                            <div className="relative aspect-video w-full bg-muted animate-pulse" />
                            <div className="p-5 flex flex-col flex-grow space-y-3">
                                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                                </div>
                                <div className="mt-auto pt-4 border-t border-border/50 flex items-center">
                                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (posts.length === 0) return null;

    return (
        <div className="mx-auto w-full max-w-7xl py-8">
            <div className="mb-8 text-center">
                <h3 className="mb-4 text-2xl font-bold flex items-center justify-center gap-2">

                    <span className="animate-pulse">
                        <Newspaper className="inline-block h-10 w-10 text-[#EC407A]" />
                    </span>
                    <span className="text-primary">LATEST ARTICLES</span>
                </h3>

                {subscriberCount !== null && (
                    <p className="text-sm text-muted-foreground mb-2">
                        {formatDearCreativeSubscriberLine(subscriberCount)}
                    </p>
                )}

                <Link
                    href={origin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline transition-colors block mt-2"
                >
                    Read all issues
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

                            <div className="flex flex-grow flex-col p-5">
                                <h3 className="mb-2 text-xl font-bold leading-tight tracking-tight text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                                    {post.title}
                                </h3>
                                {post.excerpt && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
                                        {post.excerpt}
                                    </p>
                                )}
                                <div className="mt-auto pt-4 flex items-center text-sm font-medium text-primary/80 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                    Read Article
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

            {activePost && (
                <NewsletterModal
                    isOpen={!!activePost}
                    onClose={() => setActivePost(null)}
                    postUrl={activePost.canonicalUrl ?? buildDearCreativePostUrl(origin, activePost.slug)}
                    title={activePost.title}
                />
            )}
        </div>
    );
}
