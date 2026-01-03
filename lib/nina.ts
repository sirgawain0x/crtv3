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
        const response = await fetch('/api/trending/nina');

        if (!response.ok) {
            console.error('Failed to fetch Nina releases:', response.statusText);
            return [];
        }

        const tracks = await response.json();
        return tracks;

    } catch (error) {
        console.error('Error fetching Nina trending:', error);
        return [];
    }
};
