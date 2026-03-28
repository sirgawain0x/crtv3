import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
import { base } from "viem/chains";

const ARBITRATOR_ADDRESS = "0xd04f24364687dBD6db67D2101faE59e91a6e605B"; // Precog address

async function main() {
    console.log("🕵️ Verifying Precog Arbitrator...");

    const publicClient = createPublicClient({
        chain: base,
        transport: http("https://mainnet.base.org"),
    });

    const commonAbis = parseAbi([
        "function arbitrator() view returns (address)",
        "function governor() view returns (address)",
        "function owner() view returns (address)",
        "function court() view returns (address)",
    ]);

    console.log("\n1. Probing Precog view functions...");

    try {
        const arbitrator = await publicClient.readContract({
            address: ARBITRATOR_ADDRESS,
            abi: commonAbis,
            functionName: "arbitrator",
        });
        console.log(`✅ Found 'arbitrator()': ${arbitrator}`);
    } catch (e) { console.log("   - 'arbitrator()' not found"); }

    try {
        const owner = await publicClient.readContract({
            address: ARBITRATOR_ADDRESS,
            abi: commonAbis,
            functionName: "owner",
        });
        console.log(`✅ Found 'owner()': ${owner}`);
    } catch (e) { console.log("   - 'owner()' not found"); }

}

main().catch(console.error);
