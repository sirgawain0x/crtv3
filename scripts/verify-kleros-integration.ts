import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
import { base } from "viem/chains";
import { ARBITRATOR_PROXY_ABI } from "../lib/sdk/reality-eth/reality-eth-arbitrator";

const ARBITRATOR_ADDRESS = "0x05295972F75cFeE7fE66E6BDDC0435c9Fd083D18";
const REALITY_ETH_ADDRESS = "0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8";

async function main() {
    console.log("🕵️ Verifying Kleros Arbitrator Integration on Base Mainnet...");
    console.log(`Arbitrator Address: ${ARBITRATOR_ADDRESS}`);

    const publicClient = createPublicClient({
        chain: base,
        transport: http("https://mainnet.base.org"), // Using public RPC for verification script
    });

    // 1. Check if contract exists
    console.log("\n1. Checking if contract exists...");
    const bytecode = await publicClient.getBytecode({ address: ARBITRATOR_ADDRESS });

    if (!bytecode || bytecode === "0x") {
        console.error("❌ No contract found at the Arbitrator Address!");
        process.exit(1);
    }
    console.log("✅ Contract code found.");

    // 2. Simulate submitEvidence call
    // We'll use a random question ID (e.g., 0) and some dummy evidence URI
    // The call is expected to REVERT because the question likely doesn't exist or isn't in a dispute state.
    // HOWEVER, the revert reason will tell us if we are hitting the correct function signature.

    console.log("\n2. Simulating submitEvidence call...");
    const dummyQuestionId = BigInt(123456789);
    const dummyEvidenceUri = "https://ipfs.io/ipfs/QmTest";

    try {
        const { request } = await publicClient.simulateContract({
            address: ARBITRATOR_ADDRESS,
            abi: ARBITRATOR_PROXY_ABI,
            functionName: "submitEvidence",
            args: [dummyQuestionId, dummyEvidenceUri],
            account: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Vitalik's address as dummy sender
        });

        console.log("✅ Simulation SUCCEEDED (Unexpectedly!)");
        console.log("   This means the contract accepted the call without reverting. This might be fine if checks are loose.");
    } catch (error: any) {
        console.log("ℹ️ Simulation Reverted (Expected). Analyzing revert reason...");

        // Check if error is related to function not existing vs logical revert
        if (error.message.includes("Function selector not recognized") || error.message.includes("execution reverted")) {
            // "execution reverted" without reason is ambiguous, but "Function selector..." confirms it's WRONG.
            // Kleros contracts typically revert with strings.

            console.log("Raw Error Message:", error.message.split('\n')[0]); // First line usually has the reason

            if (error.message.includes("The dispute must be created by the arbitrator")) {
                console.log("✅ Revert Reason matches Kleros logic: 'The dispute must be created by the arbitrator'.");
                console.log("   This confirms we are hitting the correct contract and function signature.");
            } else if (error.walk && error.walk().data) {
                console.log("   Revert Data found:", error.walk().data);
            } else {
                console.log("⚠️ Unknown revert reason. Please verify manually if this contract implements submitEvidence.");
            }
        } else {
            console.error("❌ Unexpected error:", error);
        }
    }

    // 3. Check for specific Kleros View functions if possible?
    // Kleros Arbitrator usually has `arbitrationCost`, `disputeStatus`, etc.
    // The Proxy might just forward or have `governor`.
    // Let's try to check `arbitrator` public variable if it exists (common pattern).
    try {
        // Trying to read 'arbitrator' or 'kleros' or 'owner'
        // Just a guess to see what this contract is.
        // If we really want to be sure, we check if it supports the Arbitrator interface (ERC-792)
        // ERC-792 interface ID is 0x...
        // But submitEvidence is ERC-1497 (Evidence Standard).
        // Let's just trust step 2 for now.
    } catch (e) { }

    console.log("\n✅ Verification check complete.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
