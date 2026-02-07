import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
import { base } from "viem/chains";

const ARBITRATOR_ADDRESS = "0x05295972F75cFeE7fE66E6BDDC0435c9Fd083D18";

async function main() {
    console.log("🕵️ Deep Verifying Kleros Arbitrator...");

    const publicClient = createPublicClient({
        chain: base,
        transport: http("https://mainnet.base.org"),
    });

    // 1. Check for common properties
    const commonAbis = parseAbi([
        "function arbitrator() view returns (address)",
        "function governor() view returns (address)",
        "function owner() view returns (address)",
        "function court() view returns (address)",
    ]);

    console.log("\n1. Probing common view functions...");

    try {
        const arbitrator = await publicClient.readContract({
            address: ARBITRATOR_ADDRESS,
            abi: commonAbis,
            functionName: "arbitrator",
        });
        console.log(`✅ Found 'arbitrator()': ${arbitrator}`);
        return; // If we found this, we are likely looking at a valid proxy/arbitrator.
    } catch (e) { console.log("   - 'arbitrator()' not found"); }

    try {
        const governor = await publicClient.readContract({
            address: ARBITRATOR_ADDRESS,
            abi: commonAbis,
            functionName: "governor",
        });
        console.log(`✅ Found 'governor()': ${governor}`);
        return;
    } catch (e) { console.log("   - 'governor()' not found"); }

    try {
        const owner = await publicClient.readContract({
            address: ARBITRATOR_ADDRESS,
            abi: commonAbis,
            functionName: "owner",
        });
        console.log(`✅ Found 'owner()': ${owner}`);
        return;
    } catch (e) { console.log("   - 'owner()' not found"); }


    // 2. Compare Revert 
    console.log("\n2. Comparing revert behavior...");

    try {
        await publicClient.simulateContract({
            address: ARBITRATOR_ADDRESS,
            abi: parseAbi(["function nonsensicalFunctionDoesNotExist()"]),
            functionName: "nonsensicalFunctionDoesNotExist",
        });
    } catch (e: any) {
        console.log("   Non-existent function error:", e.shortMessage || e.message);
    }

}

main().catch(console.error);
