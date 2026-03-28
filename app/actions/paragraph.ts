"use server";

import { paragraph } from "@/lib/paragraph-client";
import { serverLogger } from '@/lib/utils/logger';


import { unstable_cache } from "next/cache";

const DOMAIN = "news.creativeplatform.xyz";

// Cache the publication ID lookup since the domain is constant
const getCachedPublication = unstable_cache(
    async () => {
        // @ts-ignore
        const pub = await paragraph.publications.get({ domain: DOMAIN }).single();
        return pub;
    },
    ['paragraph-publication-id'],
    { revalidate: 3600, tags: ['paragraph-publication'] } // Cache for 1 hour
);

export async function getPublicationData() {
    try {
        const pub = await getCachedPublication();

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
        serverLogger.error("Error fetching publication:", error);
        return null;
    }
}

export async function getPublicationPosts(limit = 6) {
    try {
        // 1. Get Pub ID first (cached)
        const pub = await getCachedPublication();

        if (!pub?.id) return [];

        // 2. Fetch Posts
        const { items } = await paragraph.posts.get({ publicationId: pub.id });

        // Sort or filter if needed. The API should return recent by default.
        return items.slice(0, limit);
    } catch (error) {
        serverLogger.error("Error fetching posts:", error);
        return [];
    }
}

export async function getSubscriberCount() {
    try {
        const pub = await getCachedPublication();
        if (!pub?.id) return 0;

        const url = `https://public.api.paragraph.com/api/v1/publications/${pub.id}/subscribers/count`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PARAGRAPH_API_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.count || 0;
        }

        serverLogger.error("Failed to fetch subscriber count:", response.status, await response.text());
        return 0;
    } catch (error) {
        serverLogger.error("Error fetching subscribers:", error);
        return 0;
    }
}

export async function getCoinData(contractAddress: string) {
    try {
        // @ts-ignore
        const coin = await paragraph.coins.get({ contractAddress }).single();

        return coin;
    } catch (error) {
        serverLogger.error("Error fetching coin data:", error);
        return null;
    }
}

export async function getBuyArgs(contractAddress: string, walletAddress: string, amount: string) {
    try {
        const url = `https://public.api.paragraph.com/api/v1/coins/buy/contract/${contractAddress}?walletAddress=${walletAddress}&amount=${amount}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://paragraph.xyz',
                'Origin': 'https://paragraph.xyz',
                'Authorization': `Bearer ${process.env.PARAGRAPH_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        serverLogger.error("Error fetching buy args:", error);
        return null;
    }
}

export async function getSellArgs(contractAddress: string, walletAddress: string, amount: string) {
    try {
        const url = `https://public.api.paragraph.com/api/v1/coins/sell/contract/${contractAddress}?walletAddress=${walletAddress}&amount=${amount}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://paragraph.xyz',
                'Origin': 'https://paragraph.xyz',
                'Authorization': `Bearer ${process.env.PARAGRAPH_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        serverLogger.error("Error fetching sell args:", error);
        return null;
    }
}

export async function getQuote(contractAddress: string, amount: string, side: 'buy' | 'sell' = 'buy') {
    try {
        const url = `https://public.api.paragraph.com/api/v1/coins/quote/contract/${contractAddress}?amount=${amount}&side=${side}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://paragraph.xyz',
                'Origin': 'https://paragraph.xyz',
                'Authorization': `Bearer ${process.env.PARAGRAPH_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.quote; // Returns the amount of tokens (wei)
    } catch (error) {
        serverLogger.error("Error fetching quote:", error);
        return null;
    }
}
