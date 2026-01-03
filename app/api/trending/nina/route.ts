import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch('https://api.ninaprotocol.com/v1/releases?limit=20&sort=date', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch Nina releases:', response.statusText);
            return NextResponse.json([]);
        }

        const data = await response.json();
        const releases: any[] = data.releases || [];

        const tracks = releases.map((release: any) => ({
            id: release.publicKey,
            tokenId: release.publicKey,
            mintCount: release.accountData?.release?.totalSupply || "0",
            collection: {
                id: release.publicKey,
                owner: release.accountData?.authority || "Unknown",
                network: "solana",
                platform: "Nina",
                name: release.metadata?.properties?.title || "Untitled",
                image: release.metadata?.image || "",
            },
        }));

        return NextResponse.json(tracks);
    } catch (error) {
        console.error('Error fetching Nina trending:', error);
        return NextResponse.json([]);
    }
}
