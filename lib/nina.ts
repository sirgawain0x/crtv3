import { TrendingToken } from './ponder';

export interface NinaRelease {
    publicKey: string;
    metadata: {
        properties: {
            artist: string;
            title: string;
        };
        image: string;
    };
    accountData: {
        release: {
            publicKey: string;
            totalSupply: string;
            remainingSupply: string;
        };
    };
}

export const getNinaTrending = async (): Promise<TrendingToken[]> => {
    try {
        const response = await fetch('https://api.ninaprotocol.com/v1/releases?limit=20&sort=date', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch Nina releases:', response.statusText);
            return [];
        }

        const data = await response.json();
        const releases: any[] = data.releases || [];

        return releases.map((release: any) => ({
            id: release.publicKey,
            tokenId: release.publicKey,
            mintCount: release.accountData?.release?.totalSupply || "0", // Total supply as proxy for mints/activity
            collection: {
                id: release.publicKey,
                owner: release.accountData?.authority || "Unknown", // Assuming authority is the owner
                network: "solana",
                platform: "Nina",
                name: release.metadata?.properties?.title || "Untitled",
                image: release.metadata?.image || "",
            },
        }));

    } catch (error) {
        console.error('Error fetching Nina trending:', error);
        return [];
    }
};
