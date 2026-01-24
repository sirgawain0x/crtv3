import { serverLogger } from '@/lib/utils/logger';

/**
 * Check voting power for an address in a Snapshot space
 * Uses Snapshot's Score API to calculate voting power based on space strategies
 * 
 * @param space - Snapshot space identifier (e.g., "vote.thecreative.eth")
 * @param address - Wallet address to check
 * @param network - Network ID (e.g., "1" for Ethereum, "8453" for Base)
 * @param snapshot - Block number or "latest" (default: "latest")
 * @returns Voting power score or null if error
 */
export async function checkVotingPower(
  space: string,
  address: string,
  network: string = "8453", // Base network
  snapshot: string | number = "latest"
): Promise<{ score: number; hasPower: boolean } | { error: string }> {
  try {
    // First, get the space configuration to understand its strategies
    const spaceResponse = await fetch(
      `https://hub.snapshot.org/api/spaces/${space}`
    );
    
    if (!spaceResponse.ok) {
      return { error: `Failed to fetch space configuration: ${spaceResponse.statusText}` };
    }

    const spaceData = await spaceResponse.json();
    
    if (!spaceData || !spaceData.strategies) {
      return { error: "Space configuration not found or invalid" };
    }

    // Build the score API request
    const strategies = spaceData.strategies.map((strategy: any) => ({
      name: strategy.name,
      params: strategy.params || {},
    }));

    const scoreResponse = await fetch("https://score.snapshot.org/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        space,
        network,
        snapshot: snapshot === "latest" ? "latest" : String(snapshot),
        addresses: [address.toLowerCase()],
        strategies,
      }),
    });

    if (!scoreResponse.ok) {
      const errorText = await scoreResponse.text();
      return { error: `Failed to calculate voting power: ${errorText}` };
    }

    const scoreData = await scoreResponse.json();
    
    // Calculate total score across all strategies
    let totalScore = 0;
    if (scoreData.result && scoreData.result[0]) {
      const addressScores = scoreData.result[0][address.toLowerCase()];
      if (addressScores) {
        totalScore = Object.values(addressScores).reduce(
          (sum: number, score: any) => sum + (Number(score) || 0),
          0
        );
      }
    }

    // Check if score meets minimum requirement (if set)
    const minScore = spaceData.voting?.minScore || 0;
    const hasPower = totalScore >= minScore;

    return {
      score: totalScore,
      hasPower,
    };
  } catch (error) {
    serverLogger.error("Error checking voting power:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error checking voting power",
    };
  }
}
