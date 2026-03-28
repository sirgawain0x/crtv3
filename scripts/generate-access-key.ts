import { Livepeer } from "livepeer";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const apiKey = process.env.LIVEPEER_FULL_API_KEY;

if (!apiKey) {
    console.error("Error: LIVEPEER_FULL_API_KEY is not set in your environment.");
    process.exit(1);
}

const livepeer = new Livepeer({
    apiKey: apiKey,
});

async function run() {
    try {
        console.log("Generating Livepeer Signing Key...");

        // Using direct fetch API to avoid SDK ambiguity
        const response = await fetch("https://livepeer.studio/api/access-control/signing-key", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: `crtv3-signing-key-${Date.now()}`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const keyData = await response.json();

        console.log("Raw Result:", JSON.stringify(keyData, null, 2));

        if (!keyData || !keyData.publicKey) {
            throw new Error("Could not find public key in response");
        }

        console.log("\n✅ Signing Key Created Successfully!\n");
        console.log("Add the following to your .env.local file:\n");

        // The private key is usually in 'privateKey' property for this endpoint
        const privateKey = keyData.privateKey;

        if (!privateKey) {
            console.warn("⚠️  WARNING: Private Key not found in response. It requires a newly created key.");
        }

        console.log(`ACCESS_CONTROL_PRIVATE_KEY="${privateKey}"`);
        console.log(`NEXT_PUBLIC_ACCESS_CONTROL_PUBLIC_KEY="${keyData.publicKey}"`);

        console.log("\n⚠️  IMPORTANT: Save the Private Key immediately. It will not be shown again.");

    } catch (error) {
        console.error("Error creating signing key:", error);
    }
}

run();
