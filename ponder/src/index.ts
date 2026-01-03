import { ponder } from "ponder:registry";
import { collection } from "../ponder.schema";

ponder.on("SoundCreatorV1:SoundEditionCreated", async ({ event, context }: { event: any, context: any }) => {
    // Access chain name from context if available, otherwise fallback
    const networkName = context.chain ? context.chain.name : "mainnet";

    await context.db.insert(collection).values({
        id: event.args.soundEdition,
        owner: event.args.deployer,
        network: networkName,
        platform: "Sound",
        createdAt: event.block.timestamp,
        transactionHash: event.transaction.hash,
    });
});

ponder.on("ZoraCreator1155Factory:SetupNewContract", async ({ event, context }: { event: any, context: any }) => {
    const networkName = context.chain ? context.chain.name : "optimism";

    await context.db.insert(collection).values({
        id: event.args.newContract,
        owner: event.args.creator,
        network: networkName,
        platform: "Zora",
        createdAt: event.block.timestamp,
        transactionHash: event.transaction.hash,
    });
});

ponder.on("SupercollectorFactory:DeployDCNTSeries", async ({ event, context }: { event: any, context: any }) => {
    await context.db.insert(collection).values({
        id: event.args.DCNTSeries,
        owner: event.transaction.from,
        network: "optimism",
        platform: "Supercollector",
        createdAt: event.block.timestamp,
        transactionHash: event.transaction.hash,
    });
});
