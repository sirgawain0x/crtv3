"use server";

import { paragraph } from "@/lib/paragraph-client";

const DOMAIN = "news.creativeplatform.xyz";

export async function getPublicationData() {
    try {
        // @ts-ignore
        const pub = await paragraph.publications.get({ domain: DOMAIN }).single();

        if (!pub?.id) {
            throw new Error("Publication not found");
        }

        return {
            id: pub.id,
            name: pub.name,
            description: pub.summary,
            // Add other needed fields
        };
    } catch (error) {
        console.error("Error fetching publication:", error);
        return null;
    }
}

export async function getPublicationPosts(limit = 6) {
    try {
        // 1. Get Pub ID first (could be cached or passed, but looking up by domain is safest if ID changes)
        // @ts-ignore
        const pub = await paragraph.publications.get({ domain: DOMAIN }).single();

        if (!pub?.id) return [];

        // 2. Fetch Posts
        const { items } = await paragraph.posts.get({ publicationId: pub.id });

        // Sort or filter if needed. The API should return recent by default.
        return items.slice(0, limit);
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
}

export async function getSubscriberCount() {
    try {
        // @ts-ignore
        const pub = await paragraph.publications.get({ domain: DOMAIN }).single();
        if (!pub?.id) return 0;

        // Based on SDK discovery: api.subscribers.get({ publicationId }) exists
        // @ts-ignore
        const response = await paragraph.subscribers.get({ publicationId: pub.id });

        // Check structure. Response might be a list or have a meta count.
        // If it's a paginated list, it often has `meta: { total: number }`
        return (response as any).meta?.total || response.items?.length || 0;
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        return 0;
    }
}

export async function getCoinData(contractAddress: string) {
    try {
        // @ts-ignore
        const response = await paragraph.coins.get({ contractAddress });

        // Normalize response
        if (response.items && response.items.length > 0) {
            return response.items[0];
        }
        return null;
    } catch (error) {
        console.error("Error fetching coin data:", error);
        return null;
    }
}
