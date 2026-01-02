import { onchainTable } from "ponder";

export const collection = onchainTable("collection", (t) => ({
    id: t.text().primaryKey(),
    owner: t.text(),
    network: t.text(), // 'mainnet', 'optimism', etc.
    platform: t.text(), // 'Sound', 'Zora'
    createdAt: t.bigint(),
    transactionHash: t.text(),
}));

export const token = onchainTable("token", (t) => ({
    id: t.text().primaryKey(), // collectionAddress-tokenId
    collectionId: t.text(),
    tokenId: t.bigint(),
    mintCount: t.bigint(),
}));
