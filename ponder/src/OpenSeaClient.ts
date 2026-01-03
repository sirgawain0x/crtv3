import { config } from 'dotenv';
import path from 'path';

// Load env from parent directory (monorepo root)
config({ path: path.resolve(process.cwd(), '../.env') });

const apiKey = process.env.OPENSEA_API_KEY;

// Map chain names to OpenSea chain identifiers
const CHAIN_MAPPING: Record<string, string> = {
    'mainnet': 'ethereum',
    'optimism': 'optimism',
    'base': 'base',
    'zora': 'zora',
    'arbitrum': 'arbitrum',
    // Add more mappings as needed
};

export const fetchCollectionMetadata = async (address: string, chainName: string) => {
    if (!apiKey) return null;

    const chain = CHAIN_MAPPING[chainName.toLowerCase()];
    if (!chain) {
        console.warn(`OpenSeaClient: Unsupported chain: ${chainName}`);
        return null;
    }

    try {
        const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${address}`;
        const response = await fetch(url, {
            headers: {
                'x-api-key': apiKey,
                'accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Contract might not exist on OpenSea or not indexed yet
                return null;
            }
            console.warn(`OpenSeaClient: Failed to fetch metadata for ${address} on ${chain}. Status: ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Structure of response based on OpenSea API v2 'Get Contract' endpoint
        // It returns contract object. It may have 'collection' field which is the slug.

        let name = data.name || data.collection;
        let image = data.image_url || "";

        // If we have a collection slug, and no image (or just to be safe), fetch collection details
        if (data.collection) {
            try {
                const collectionUrl = `https://api.opensea.io/api/v2/collections/${data.collection}`;
                const collectionResponse = await fetch(collectionUrl, {
                    headers: {
                        'x-api-key': apiKey,
                        'accept': 'application/json'
                    }
                });

                if (collectionResponse.ok) {
                    const collectionData = await collectionResponse.json();
                    if (collectionData.image_url) {
                        image = collectionData.image_url;
                    }
                    // Fallback name from collection if contract name missing
                    if (!name && collectionData.name) {
                        name = collectionData.name;
                    }
                }
            } catch (e) {
                console.warn(`OpenSeaClient: Failed to fetch collection details for ${data.collection}`, e);
            }
        }

        if (name) {
            return {
                name: name,
                image: image
            };
        }

        return null;

    } catch (error) {
        console.warn(`OpenSeaClient: Error fetching metadata for ${address}:`, error);
        return null;
    }
};
