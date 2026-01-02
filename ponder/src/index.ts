import { ponder } from "ponder:registry";

ponder.on("SoundCreatorV1:SoundEditionCreated", async ({ event, context }: { event: any, context: any }) => {
    const { collection } = context.db;
    // Access chain name from context if available, otherwise fallback
    const networkName = context.chain ? context.chain.name : "mainnet";

    await collection.create({
        id: event.args.soundEdition,
        data: {
            owner: event.args.deployer,
            network: networkName,
            platform: "Sound",
            createdAt: event.block.timestamp,
            transactionHash: event.transaction.hash,
        },
    });
});

ponder.on("ZoraCreator1155Factory:SetupNewContract", async ({ event, context }: { event: any, context: any }) => {
    const { collection } = context.db;
    const networkName = context.chain ? context.chain.name : "optimism";

    await collection.create({
        id: event.args.newContract,
        data: {
            owner: event.args.creator,
            network: networkName,
            platform: "Zora",
            createdAt: event.block.timestamp,
            transactionHash: event.transaction.hash,
        }
    });
});
