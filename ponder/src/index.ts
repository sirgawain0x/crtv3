import { ponder } from "ponder:registry";
import { collection } from "../ponder.schema";

import { MinimalContractAbi } from "../abis/MinimalContractAbi";

ponder.on("SoundCreatorV1:SoundEditionCreated", async ({ event, context }: { event: any, context: any }) => {
    // Access chain name from context if available, otherwise fallback
    const networkName = context.chain ? context.chain.name : "mainnet";
    const contractAddress = event.args.soundEdition;

    // Fetch contract name from chain
    let contractName = "Sound Edition";
    try {
        contractName = await context.client.readContract({
            address: contractAddress,
            abi: MinimalContractAbi,
            functionName: "name",
        });
    } catch (e) {
        console.warn(`Failed to fetch name for ${contractAddress}`);
    }

    let image = "";
    try {
        // Try to fetch image from OpenSea
        const metadata = await fetchCollectionMetadata(contractAddress, networkName);
        if (metadata) {
            if (metadata.image) image = metadata.image;
            // We prioritize on-chain name, but could fallback to metadata.name if needed
            if (!contractName || contractName === "Sound Edition") {
                if (metadata.name) contractName = metadata.name;
            }
        }
    } catch (e) {
        console.warn(`Failed to fetch OpenSea metadata for ${contractAddress}`);
    }

    await context.db.insert(collection).values({
        id: contractAddress,
        owner: event.args.deployer,
        network: networkName,
        platform: "Sound",
        name: contractName,
        image: image,
        createdAt: event.block.timestamp,
        transactionHash: event.transaction.hash,
    });
});

import { fetchCollectionMetadata } from "./OpenSeaClient";

ponder.on("ZoraCreator1155Factory:SetupNewContract", async ({ event, context }: { event: any, context: any }) => {
    const networkName = context.chain ? context.chain.name : "optimism";
    const contractAddress = event.args.newContract;

    let name = "";
    let image = "";

    try {
        const metadata = await fetchCollectionMetadata(contractAddress, networkName);
        if (metadata) {
            name = metadata.name || "";
            image = metadata.image || "";
        }
    } catch (e) {
        console.warn(`Failed to fetch OpenSea metadata for ${contractAddress}`);
    }

    await context.db.insert(collection).values({
        id: contractAddress,
        owner: event.args.creator,
        network: networkName,
        platform: "Zora",
        name: name,
        image: image,
        createdAt: event.block.timestamp,
        transactionHash: event.transaction.hash,
    });
});

ponder.on("SupercollectorFactory:DeployDCNTSeries", async ({ event, context }: { event: any, context: any }) => {
    const contractAddress = event.args.DCNTSeries;
    const networkName = "optimism"; // Hardcoded in original, preserving

    let name = "";
    let image = "";

    try {
        const metadata = await fetchCollectionMetadata(contractAddress, networkName);
        if (metadata) {
            name = metadata.name || "";
            image = metadata.image || "";
        }
    } catch (e) {
        console.warn(`Failed to fetch OpenSea metadata for ${contractAddress}`);
    }

    await context.db.insert(collection).values({
        id: contractAddress,
        owner: event.transaction.from,
        network: networkName,
        platform: "Supercollector",
        name: name,
        image: image,
        createdAt: event.block.timestamp,
        transactionHash: event.transaction.hash,
    });
});
